import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { resolveMatchResult } from "@/lib/services/tournament-bracket.service";
import { getRequiredWinsForFormat } from "@/lib/services/match-scoring";
import { promoteWaitlistIfSlotAvailable } from "@/lib/services/tournament-waitlist.service";
import { createNotificationService } from "@/lib/services/notification.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string; participantId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id, participantId } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: { id: true, status: true, createdById: true, format: true },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (!hasRole(currentUser.role, ROLES.OFFICER) && currentUser.id !== tournament.createdById) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        if (!["OPEN", "ONGOING"].includes(tournament.status)) {
            return NextResponse.json({ success: false, message: "Turnamen sudah ditutup" }, { status: 409 });
        }

        const participant = await prisma.tournamentParticipant.findUnique({
            where: { id: participantId },
            select: { id: true, tournamentId: true, status: true },
        });

        if (!participant || participant.tournamentId !== id) {
            return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
        }

        if (participant.status === "DISQUALIFIED") {
            return NextResponse.json({ success: true, participant, message: "Peserta sudah didiskualifikasi." }, { status: 200 });
        }

        const updatedParticipant = await prisma.tournamentParticipant.update({
            where: { id: participantId },
            data: { status: "DISQUALIFIED" },
        });

        const matches = await prisma.match.findMany({
            where: {
                tournamentId: id,
                status: { not: "COMPLETED" },
                OR: [{ playerAId: participantId }, { playerBId: participantId }],
            },
            select: {
                id: true,
                playerAId: true,
                playerBId: true,
                playerA: { select: { status: true, userId: true, teamId: true } },
                playerB: { select: { status: true, userId: true, teamId: true } },
            },
        });

        const requiredWins = getRequiredWinsForFormat(tournament.format);
        const resolvedMatchIds: string[] = [];
        const clearedMatchIds: string[] = [];
        const notifications = createNotificationService({ prisma });
        const teamNotifyRoles = ["CAPTAIN", "VICE_CAPTAIN", "MANAGER"] as const;

        for (const match of matches) {
            const disqualifiedIsA = match.playerAId === participantId;
            const opponentId = disqualifiedIsA ? match.playerBId : match.playerAId;
            const opponentStatus = disqualifiedIsA ? match.playerB?.status : match.playerA?.status;
            const opponentEligible = Boolean(opponentId && opponentStatus !== "DISQUALIFIED");

            if (opponentEligible && opponentId) {
                const scoreA = disqualifiedIsA ? 0 : requiredWins;
                const scoreB = disqualifiedIsA ? requiredWins : 0;

                await resolveMatchResult(prisma, match.id, {
                    scoreA,
                    scoreB,
                    winnerId: opponentId,
                    source: "ADMIN",
                    confirmedById: currentUser.id,
                });

                await prisma.matchDispute.updateMany({
                    where: { matchId: match.id, status: "OPEN" },
                    data: { status: "RESOLVED", resolvedById: currentUser.id, resolvedAt: new Date() },
                });

                const opponent = disqualifiedIsA ? match.playerB : match.playerA;
                if (opponent) {
                    const recipientIds = new Set<string>();
                    if (opponent.userId) recipientIds.add(opponent.userId);
                    if (opponent.teamId) {
                        const teamMembers = await prisma.teamMember.findMany({
                            where: {
                                teamId: opponent.teamId,
                                leftAt: null,
                                role: { in: [...teamNotifyRoles] },
                            },
                            select: { userId: true },
                        });
                        teamMembers.forEach((member) => recipientIds.add(member.userId));
                    }

                    if (recipientIds.size > 0) {
                        try {
                            await Promise.all(
                                Array.from(recipientIds).map((userId) =>
                                    notifications.createNotification({
                                        userId,
                                        type: "SYSTEM_ALERT",
                                        title: "Lawan Didiskualifikasi",
                                        message: "Lawan kamu didiskualifikasi. Kamu otomatis lanjut ke match berikutnya.",
                                        link: `/tournaments/${id}`,
                                    })
                                )
                            );
                        } catch (notifyError) {
                            console.error("[Tournament Disqualify Notify]", notifyError);
                        }
                    }
                }

                resolvedMatchIds.push(match.id);
                continue;
            }

            const nextPlayerAId = match.playerAId && match.playerA?.status !== "DISQUALIFIED" ? match.playerAId : null;
            const nextPlayerBId = match.playerBId && match.playerB?.status !== "DISQUALIFIED" ? match.playerBId : null;
            const nextStatus = nextPlayerAId && nextPlayerBId ? "READY" : "PENDING";

            await prisma.match.update({
                where: { id: match.id },
                data: {
                    playerAId: nextPlayerAId,
                    playerBId: nextPlayerBId,
                    status: nextStatus,
                    winnerId: null,
                    scoreA: 0,
                    scoreB: 0,
                    matchVersion: { increment: 1 },
                },
            });

            await prisma.matchResult.deleteMany({ where: { matchId: match.id } });
            await prisma.matchReport.deleteMany({ where: { matchId: match.id } });
            await prisma.matchDispute.updateMany({
                where: { matchId: match.id, status: "OPEN" },
                data: { status: "RESOLVED", resolvedById: currentUser.id, resolvedAt: new Date() },
            });

            await prisma.matchPlayer.deleteMany({ where: { matchId: match.id } });
            const nextPlayers = [
                ...(nextPlayerAId ? [{ matchId: match.id, participantId: nextPlayerAId, side: "A" as const }] : []),
                ...(nextPlayerBId ? [{ matchId: match.id, participantId: nextPlayerBId, side: "B" as const }] : []),
            ];
            if (nextPlayers.length > 0) {
                await prisma.matchPlayer.createMany({ data: nextPlayers, skipDuplicates: true });
            }

            clearedMatchIds.push(match.id);
        }

        const promotion = await promoteWaitlistIfSlotAvailable(prisma, id, { actorUserId: currentUser.id });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.TOURNAMENT_PARTICIPANT_DISQUALIFIED,
            targetId: participantId,
            targetType: "TournamentParticipant",
            details: {
                tournamentId: id,
                resolvedMatches: resolvedMatchIds.length,
                clearedMatches: clearedMatchIds.length,
            },
        });

        return NextResponse.json({
            success: true,
            participant: updatedParticipant,
            resolvedMatchIds,
            clearedMatchIds,
            promotion,
        });
    } catch (error) {
        console.error("[Tournament Participant Disqualify]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
