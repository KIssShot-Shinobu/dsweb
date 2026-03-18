import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractIP, logAudit } from "@/lib/audit-logger";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { syncOrCreateTournamentBracket } from "@/lib/services/tournament-bracket.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { getRateLimitEnabled, getRateLimitTournamentRegister } from "@/lib/runtime-config";
import { tournamentRegisterSchema } from "@/lib/validators";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Silakan login terlebih dahulu" }, { status: 401 });
        }

        if (currentUser.status !== "ACTIVE") {
            return NextResponse.json({ success: false, message: "Hanya akun aktif yang dapat mendaftar turnamen" }, { status: 403 });
        }

        const userId = currentUser.id;
        const { id: tournamentId } = await params;
        const ipAddress = extractIP(request.headers);

        if (getRateLimitEnabled()) {
            const { max, windowSeconds } = getRateLimitTournamentRegister();
            const rate = checkRateLimit(`tournament-register:${userId}:${ipAddress}`, {
                windowMs: windowSeconds * 1000,
                max,
            });
            if (!rate.allowed) {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.RATE_LIMIT_HIT,
                    targetId: tournamentId,
                    targetType: "Tournament",
                    details: { scope: "tournament_register", resetAt: new Date(rate.resetAt).toISOString() },
                });
                return NextResponse.json({ success: false, message: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
            }
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                game: { select: { id: true, code: true, name: true } },
            },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (tournament.status !== "OPEN") {
            return NextResponse.json({ success: false, message: "Pendaftaran Turnamen sudah ditutup" }, { status: 400 });
        }

        const now = new Date();
        if (tournament.registrationOpen && now < tournament.registrationOpen) {
            return NextResponse.json({ success: false, message: "Pendaftaran belum dibuka" }, { status: 400 });
        }
        if (tournament.registrationClose && now > tournament.registrationClose) {
            return NextResponse.json({ success: false, message: "Pendaftaran sudah ditutup" }, { status: 400 });
        }

        const contentType = request.headers.get("content-type") ?? "";
        const rawBody = contentType.includes("application/json") ? await request.json().catch(() => ({})) : {};
        const parsedBody = tournamentRegisterSchema.safeParse(rawBody);
        if (!parsedBody.success) {
            return NextResponse.json(
                { success: false, message: parsedBody.error.issues[0]?.message || "Input tidak valid" },
                { status: 400 }
            );
        }
        const paymentProofUrl = parsedBody.data.paymentProofUrl;
        const requiresPayment = tournament.entryFee > 0;

        const isTeamTournament = tournament.isTeamTournament || tournament.mode !== "INDIVIDUAL";
        const activeCount = await prisma.tournamentParticipant.count({
            where: {
                tournamentId,
                status: { in: ["REGISTERED", "CHECKED_IN", "PLAYING"] },
            },
        });
        const isFull = Boolean(tournament.maxPlayers && activeCount >= tournament.maxPlayers);

        if (isTeamTournament) {
            const allowedRoles = ["CAPTAIN", "VICE_CAPTAIN", "MANAGER"];
            if (!currentUser.teamId || !currentUser.teamMembershipRole || !allowedRoles.includes(currentUser.teamMembershipRole)) {
                return NextResponse.json(
                    { success: false, message: "Pendaftaran team hanya untuk captain, vice captain, atau manager." },
                    { status: 403 }
                );
            }

            const team = await prisma.team.findUnique({
                where: { id: currentUser.teamId },
                select: { id: true, name: true, isActive: true },
            });

            if (!team || !team.isActive) {
                return NextResponse.json({ success: false, message: "Team tidak aktif atau tidak ditemukan." }, { status: 400 });
            }

            const existingTeam = await prisma.tournamentParticipant.findUnique({
                where: { tournamentId_teamId: { tournamentId, teamId: team.id } },
            });

            if (existingTeam) {
                if (requiresPayment) {
                    if (existingTeam.paymentStatus === "REJECTED" && paymentProofUrl) {
                        const updated = await prisma.tournamentParticipant.update({
                            where: { id: existingTeam.id },
                            data: {
                                paymentStatus: "PENDING",
                                paymentProofUrl,
                                paymentVerifiedAt: null,
                            },
                        });
                        return NextResponse.json(
                            { success: true, participant: updated, message: "Bukti pembayaran diperbarui. Menunggu verifikasi admin." },
                            { status: 200 }
                        );
                    }
                    if (existingTeam.paymentStatus === "PENDING") {
                        return NextResponse.json({ success: true, participant: existingTeam, message: "Pendaftaran menunggu verifikasi admin." }, { status: 200 });
                    }
                }
                if (existingTeam.status === "WAITLIST") {
                    return NextResponse.json({ success: true, participant: existingTeam, message: "Team sudah berada di waitlist turnamen ini" }, { status: 200 });
                }
                return NextResponse.json({ success: true, participant: existingTeam, message: "Team sudah terdaftar di turnamen ini" }, { status: 200 });
            }

            if (requiresPayment && !paymentProofUrl) {
                return NextResponse.json({ success: false, message: "Bukti pembayaran wajib diunggah." }, { status: 400 });
            }

            if (isFull) {
                const waitlisted = await prisma.tournamentParticipant.create({
                    data: {
                        tournamentId,
                        teamId: team.id,
                        guestName: team.name,
                        gameId: team.name,
                        status: "WAITLIST",
                        paymentStatus: requiresPayment ? "PENDING" : "VERIFIED",
                        ...(paymentProofUrl ? { paymentProofUrl } : {}),
                    },
                });

                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.TOURNAMENT_WAITLISTED,
                    targetId: tournamentId,
                    targetType: "Tournament",
                    details: {
                        teamId: team.id,
                        teamName: team.name,
                        tournamentTitle: tournament.title,
                    },
                });

                return NextResponse.json(
                    {
                        success: true,
                        participant: waitlisted,
                        message: "Slot penuh. Team masuk waitlist dan akan dipromosikan jika ada slot kosong.",
                    },
                    { status: 201 }
                );
            }

            const participant = await prisma.tournamentParticipant.create({
                data: {
                    tournamentId,
                    teamId: team.id,
                    guestName: team.name,
                    gameId: team.name,
                    paymentStatus: requiresPayment ? "PENDING" : "VERIFIED",
                    ...(paymentProofUrl ? { paymentProofUrl } : {}),
                },
            });

            await logAudit({
                userId,
                action: AUDIT_ACTIONS.TOURNAMENT_REGISTERED,
                targetId: tournamentId,
                targetType: "Tournament",
                details: {
                    teamId: team.id,
                    teamName: team.name,
                    gameCode: tournament.game?.code ?? "",
                    tournamentTitle: tournament.title,
                },
            });

            if (!requiresPayment) {
                await syncOrCreateTournamentBracket(prisma, tournamentId, [participant.id]);
            }

            return NextResponse.json(
                {
                    success: true,
                    participant,
                    message: requiresPayment
                        ? "Team terdaftar. Menunggu verifikasi pembayaran."
                        : "Team berhasil terdaftar di turnamen.",
                },
                { status: 201 }
            );
        }

        // Check if already registered
        const existingParticipant = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: { tournamentId, userId }
            }
        });

        if (existingParticipant) {
            if (requiresPayment) {
                if (existingParticipant.paymentStatus === "REJECTED" && paymentProofUrl) {
                    const updated = await prisma.tournamentParticipant.update({
                        where: { id: existingParticipant.id },
                        data: {
                            paymentStatus: "PENDING",
                            paymentProofUrl,
                            paymentVerifiedAt: null,
                        },
                    });
                    return NextResponse.json(
                        { success: true, participant: updated, message: "Bukti pembayaran diperbarui. Menunggu verifikasi admin." },
                        { status: 200 }
                    );
                }
                if (existingParticipant.paymentStatus === "PENDING") {
                    return NextResponse.json({ success: true, participant: existingParticipant, message: "Pendaftaran menunggu verifikasi admin." }, { status: 200 });
                }
            }
            if (existingParticipant.status === "WAITLIST") {
                return NextResponse.json({ success: true, participant: existingParticipant, message: "Anda sudah berada di waitlist turnamen ini" }, { status: 200 });
            }
            return NextResponse.json({ success: true, participant: existingParticipant, message: "Anda sudah terdaftar di turnamen ini" }, { status: 200 });
        }

        // Get Game Profile specific to tournament format to snapshot IGN
        const gameProfile = await prisma.playerGameAccount.findFirst({
            where: {
                userId,
                gameId: tournament.gameId
            }
        });

        if (!gameProfile) {
            const gameLabel = tournament.game?.name ?? "Game";
            return NextResponse.json({ success: false, message: `Harap lengkapi Profil Game ${gameLabel} di Pengaturan Profil Anda terlebih dahulu` }, { status: 400 });
        }

        if (requiresPayment && !paymentProofUrl) {
            return NextResponse.json({ success: false, message: "Bukti pembayaran wajib diunggah." }, { status: 400 });
        }

        if (isFull) {
            const waitlisted = await prisma.tournamentParticipant.create({
                data: {
                    tournamentId,
                    userId,
                    gameId: gameProfile.ign,
                    status: "WAITLIST",
                    paymentStatus: requiresPayment ? "PENDING" : "VERIFIED",
                    ...(paymentProofUrl ? { paymentProofUrl } : {}),
                }
            });

            await logAudit({
                userId,
                action: AUDIT_ACTIONS.TOURNAMENT_WAITLISTED,
                targetId: tournamentId,
                targetType: "Tournament",
                details: {
                    ign: gameProfile.ign,
                    gameCode: tournament.game?.code ?? "",
                    tournamentTitle: tournament.title,
                },
            });

            return NextResponse.json(
                {
                    success: true,
                    participant: waitlisted,
                    message: "Slot penuh. Anda masuk waitlist dan akan dipromosikan jika ada slot kosong.",
                },
                { status: 201 }
            );
        }

        const participant = await prisma.tournamentParticipant.create({
            data: {
                tournamentId,
                userId,
                gameId: gameProfile.ign, // snapshot IGN
                paymentStatus: requiresPayment ? "PENDING" : "VERIFIED",
                ...(paymentProofUrl ? { paymentProofUrl } : {}),
            }
        });

        await logAudit({
            userId,
            action: AUDIT_ACTIONS.TOURNAMENT_REGISTERED,
            targetId: tournamentId,
            targetType: "Tournament",
            details: {
                ign: gameProfile.ign,
                gameCode: tournament.game?.code ?? "",
                tournamentTitle: tournament.title,
            },
        });

        if (!requiresPayment) {
            await syncOrCreateTournamentBracket(prisma, tournamentId, [participant.id]);
        }

        return NextResponse.json(
            {
                success: true,
                participant,
                message: requiresPayment
                    ? "Pendaftaran berhasil. Menunggu verifikasi pembayaran."
                    : "Berhasil mendaftar turnamen!",
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("Error registering to tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
