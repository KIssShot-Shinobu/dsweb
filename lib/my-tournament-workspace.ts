import { prisma } from "@/lib/prisma";
import { formatDisplayDateTimeInTimeZone, formatLocalDateTimeInTimeZone } from "@/lib/datetime";
import type { Locale } from "@/lib/i18n/locales";

type WorkspaceUser = {
    id: string;
    teamId?: string | null;
};

export type TournamentWorkspaceMatchSummary = {
    id: string;
    status: string;
    scheduledAt: string | null;
    scheduledAtLabel?: string | null;
    scheduledAtUtc?: string | null;
    playerA: { id: string; name: string } | null;
    playerB: { id: string; name: string } | null;
    report: {
        scoreA: number;
        scoreB: number;
        winnerId: string;
        evidenceUrls: string[] | null;
    } | null;
    hasOpenDispute: boolean;
    disputeReason: string | null;
};

function resolveParticipantName(participant?: {
    guestName: string | null;
    user?: { fullName: string | null; username: string | null } | null;
}) {
    if (!participant) return "TBD";
    return participant.user?.username || participant.user?.fullName || participant.guestName || "TBD";
}

export async function findTournamentParticipantForUser(tournamentId: string, user: WorkspaceUser) {
    const where =
        user.teamId
            ? {
                  tournamentId,
                  OR: [{ userId: user.id }, { teamId: user.teamId }],
              }
            : {
                  tournamentId,
                  userId: user.id,
              };

    return prisma.tournamentParticipant.findFirst({
        where,
        select: {
            id: true,
            status: true,
            paymentStatus: true,
            paymentProofUrl: true,
            paymentVerifiedAt: true,
            joinedAt: true,
        },
    });
}

export async function findActiveWorkspaceMatch(params: {
    tournamentId: string;
    participantId: string;
    userId: string;
    locale: Locale;
    timezone: string;
}) {
    const match = await prisma.match.findFirst({
        where: {
            tournamentId: params.tournamentId,
            status: { not: "COMPLETED" },
            OR: [{ playerAId: params.participantId }, { playerBId: params.participantId }],
        },
        orderBy: [{ round: { roundNumber: "asc" } }, { bracketIndex: "asc" }],
        select: {
            id: true,
            status: true,
            scheduledAt: true,
            playerA: { select: { id: true, guestName: true, user: { select: { fullName: true, username: true } } } },
            playerB: { select: { id: true, guestName: true, user: { select: { fullName: true, username: true } } } },
            reports: {
                where: { reportedById: params.userId },
                select: { scoreA: true, scoreB: true, winnerId: true, evidenceUrls: true },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
            disputes: {
                where: { status: "OPEN" },
                select: { reason: true },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
    });

    if (!match) return null;

    return {
        id: match.id,
        status: match.status,
        scheduledAt: match.scheduledAt ? formatLocalDateTimeInTimeZone(match.scheduledAt, params.timezone) : null,
        scheduledAtLabel: match.scheduledAt
            ? formatDisplayDateTimeInTimeZone(match.scheduledAt, params.timezone, params.locale)
            : null,
        scheduledAtUtc: match.scheduledAt ? match.scheduledAt.toISOString() : null,
        playerA: match.playerA ? { id: match.playerA.id, name: resolveParticipantName(match.playerA) } : null,
        playerB: match.playerB ? { id: match.playerB.id, name: resolveParticipantName(match.playerB) } : null,
        report: match.reports[0]
            ? {
                  scoreA: match.reports[0].scoreA,
                  scoreB: match.reports[0].scoreB,
                  winnerId: match.reports[0].winnerId,
                  evidenceUrls: Array.isArray(match.reports[0].evidenceUrls) ? match.reports[0].evidenceUrls : null,
              }
            : null,
        hasOpenDispute: match.disputes.length > 0,
        disputeReason: match.disputes[0]?.reason ?? null,
    } satisfies TournamentWorkspaceMatchSummary;
}
