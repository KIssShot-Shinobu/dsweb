import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractIP, logAudit } from "@/lib/audit-logger";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { syncOrCreateTournamentBracket } from "@/lib/services/tournament-bracket.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { getRateLimitEnabled, getRateLimitTournamentRegister } from "@/lib/runtime-config";

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
                _count: {
                    select: { participants: true },
                },
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

        // Check if already registered
        const existingParticipant = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: { tournamentId, userId }
            }
        });

        if (existingParticipant) {
            return NextResponse.json({ success: false, message: "Anda sudah terdaftar di turnamen ini" }, { status: 400 });
        }

        if (tournament.maxPlayers && tournament._count.participants >= tournament.maxPlayers) {
            return NextResponse.json({ success: false, message: "Slot peserta sudah penuh" }, { status: 409 });
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

        const participant = await prisma.tournamentParticipant.create({
            data: {
                tournamentId,
                userId,
                gameId: gameProfile.ign // snapshot IGN
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

        await syncOrCreateTournamentBracket(prisma, tournamentId, [participant.id]);

        return NextResponse.json({ success: true, participant, message: "Berhasil mendaftar turnamen!" }, { status: 201 });

    } catch (error) {
        console.error("Error registering to tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
