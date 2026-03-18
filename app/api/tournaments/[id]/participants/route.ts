import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentParticipantAddSchema, tournamentParticipantsQuerySchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { syncOrCreateTournamentBracket } from "@/lib/services/tournament-bracket.service";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const parsed = tournamentParticipantsQuerySchema.safeParse({
            search: searchParams.get("search") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Query tidak valid" }, { status: 400 });
        }

        const page = parsed.data.page ?? 1;
        const limit = parsed.data.limit ?? DEFAULT_LIMIT;
        const skip = (page - 1) * limit;
        const search = parsed.data.search?.toLowerCase();

        const where = {
            tournamentId: id,
            ...(search
                ? {
                      OR: [
                          { gameId: { contains: search } },
                          { guestName: { contains: search } },
                          { team: { name: { contains: search } } },
                          { user: { fullName: { contains: search } } },
                          { user: { username: { contains: search } } },
                          { user: { email: { contains: search } } },
                      ],
                  }
                : {}),
        };

        const [participants, total] = await Promise.all([
            prisma.tournamentParticipant.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            discordId: true,
                            avatarUrl: true,
                        },
                    },
                    team: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            logoUrl: true,
                        },
                    },
                },
                orderBy: { joinedAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.tournamentParticipant.count({ where }),
        ]);

        return NextResponse.json({ success: true, participants, total, page, limit });
    } catch (error) {
        console.error("[Tournament Participants]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                createdById: true,
                title: true,
                maxPlayers: true,
                mode: true,
                isTeamTournament: true,
                _count: { select: { participants: true } },
            },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (!hasRole(currentUser.role, ROLES.OFFICER) && currentUser.id !== tournament.createdById) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        if (tournament.status !== "OPEN") {
            return NextResponse.json({ success: false, message: "Pendaftaran turnamen sudah ditutup" }, { status: 400 });
        }

        const isTeamTournament = tournament.isTeamTournament || tournament.mode !== "INDIVIDUAL";
        if (isTeamTournament) {
            return NextResponse.json({ success: false, message: "Turnamen team tidak menerima penambahan peserta manual." }, { status: 400 });
        }

        const body = await request.json();
        const parsed = tournamentParticipantAddSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
        }

        const { userId, guestName, gameId } = parsed.data;

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, status: true },
            });

            if (!user) {
                return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
            }

            if (user.status !== "ACTIVE") {
                return NextResponse.json({ success: false, message: "Hanya user aktif yang bisa ditambahkan" }, { status: 400 });
            }

            const existing = await prisma.tournamentParticipant.findUnique({
                where: {
                    tournamentId_userId: { tournamentId: id, userId },
                },
            });

            if (existing) {
                return NextResponse.json({ success: false, message: "User sudah terdaftar di turnamen ini" }, { status: 409 });
            }

            const activeCount = await prisma.tournamentParticipant.count({
                where: {
                    tournamentId: id,
                    status: { in: ["REGISTERED", "CHECKED_IN", "PLAYING"] },
                },
            });
            const isFull = Boolean(tournament.maxPlayers && activeCount >= tournament.maxPlayers);

            if (isFull) {
                const participant = await prisma.tournamentParticipant.create({
                    data: {
                        tournamentId: id,
                        userId,
                        gameId,
                        status: "WAITLIST",
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                                email: true,
                                discordId: true,
                                avatarUrl: true,
                            },
                        },
                    },
                });

                await logAudit({
                    userId: currentUser.id,
                    action: AUDIT_ACTIONS.TOURNAMENT_WAITLISTED,
                    targetId: id,
                    targetType: "Tournament",
                    details: { addedUserId: userId },
                });

                return NextResponse.json(
                    { success: true, participant, message: "Slot penuh. Peserta masuk waitlist." },
                    { status: 201 }
                );
            }

            const participant = await prisma.tournamentParticipant.create({
                data: {
                    tournamentId: id,
                    userId,
                    gameId,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            discordId: true,
                            avatarUrl: true,
                        },
                    },
                },
            });

            await logAudit({
                userId: currentUser.id,
                action: AUDIT_ACTIONS.TOURNAMENT_REGISTERED,
                targetId: id,
                targetType: "Tournament",
                details: { addedUserId: userId },
            });

            const syncResult = await syncOrCreateTournamentBracket(prisma, id, [participant.id]);

            return NextResponse.json({ success: true, participant, ...syncResult }, { status: 201 });
        }

        const existingGuest = await prisma.tournamentParticipant.findFirst({
            where: { tournamentId: id, guestName },
            select: { id: true },
        });

        if (existingGuest) {
            return NextResponse.json({ success: false, message: "Guest dengan nama yang sama sudah terdaftar" }, { status: 409 });
        }

        const activeCount = await prisma.tournamentParticipant.count({
            where: {
                tournamentId: id,
                status: { in: ["REGISTERED", "CHECKED_IN", "PLAYING"] },
            },
        });
        const isFull = Boolean(tournament.maxPlayers && activeCount >= tournament.maxPlayers);

        const participant = await prisma.tournamentParticipant.create({
            data: {
                tournamentId: id,
                guestName,
                gameId,
                status: isFull ? "WAITLIST" : "REGISTERED",
            },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.TOURNAMENT_REGISTERED,
            targetId: id,
            targetType: "Tournament",
            details: { guestName, tournamentTitle: tournament.title },
        });

        const syncResult = isFull ? { created: false, syncedCount: 0, pendingCount: 0 } : await syncOrCreateTournamentBracket(prisma, id, [participant.id]);

        if (isFull) {
            await logAudit({
                userId: currentUser.id,
                action: AUDIT_ACTIONS.TOURNAMENT_WAITLISTED,
                targetId: id,
                targetType: "Tournament",
                details: { guestName, tournamentTitle: tournament.title },
            });
        }

        return NextResponse.json(
            {
                success: true,
                participant,
                message: isFull ? "Slot penuh. Guest masuk waitlist." : undefined,
                ...syncResult,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[Tournament Participants POST]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
