import { prisma, type PrismaClient } from "@/lib/prisma";
import { createNotificationService } from "@/lib/services/notification.service";
import { syncOrCreateTournamentBracket } from "@/lib/services/tournament-bracket.service";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

type PromotionResult = {
    promotedCount: number;
    promotedIds: string[];
};

type PromotionOptions = {
    actorUserId?: string;
};

const ACTIVE_STATUS = ["REGISTERED", "CHECKED_IN", "PLAYING"] as const;

async function getActiveCount(tx: PrismaClient, tournamentId: string) {
    return tx.tournamentParticipant.count({
        where: {
            tournamentId,
            status: { in: ACTIVE_STATUS },
        },
    });
}

export async function promoteWaitlistIfSlotAvailable(
    db: PrismaClient = prisma,
    tournamentId: string,
    options: PromotionOptions = {}
): Promise<PromotionResult> {
    const tournament = await db.tournament.findUnique({
        where: { id: tournamentId },
        select: { id: true, status: true, maxPlayers: true, entryFee: true, title: true },
    });

    if (!tournament || !tournament.maxPlayers || tournament.status !== "OPEN") {
        return { promotedCount: 0, promotedIds: [] };
    }

    const activeCount = await getActiveCount(db, tournamentId);
    const available = Math.max(0, tournament.maxPlayers - activeCount);
    if (available <= 0) {
        return { promotedCount: 0, promotedIds: [] };
    }

    const waitlisted = await db.tournamentParticipant.findMany({
        where: { tournamentId, status: "WAITLIST" },
        orderBy: { joinedAt: "asc" },
        take: available,
        select: { id: true, userId: true, teamId: true },
    });

    if (waitlisted.length === 0) {
        return { promotedCount: 0, promotedIds: [] };
    }

    const promotedIds = waitlisted.map((item) => item.id);
    await db.tournamentParticipant.updateMany({
        where: { id: { in: promotedIds } },
        data: { status: "REGISTERED" },
    });

    const notifications = createNotificationService({ prisma: db });
    const teamIds = Array.from(new Set(waitlisted.map((item) => item.teamId).filter(Boolean))) as string[];

    if (teamIds.length > 0) {
        const teamMembers = await db.teamMember.findMany({
            where: {
                teamId: { in: teamIds },
                leftAt: null,
                role: { in: ["CAPTAIN", "VICE_CAPTAIN", "MANAGER"] },
            },
            select: { userId: true, teamId: true },
        });

        await Promise.all(
            teamMembers.map((member) =>
                notifications.createNotification({
                    userId: member.userId,
                    type: "SYSTEM_ALERT",
                    title: "Team Masuk Slot Turnamen",
                    message: `Team kamu berhasil naik dari waitlist di turnamen ${tournament.title}.`,
                    link: `/tournaments/${tournament.id}`,
                })
            )
        );
    }

    const userIds = waitlisted.map((item) => item.userId).filter(Boolean) as string[];
    await Promise.all(
        userIds.map((userId) =>
            notifications.createNotification({
                userId,
                type: "SYSTEM_ALERT",
                title: "Slot Turnamen Terbuka",
                message: `Kamu berhasil naik dari waitlist di turnamen ${tournament.title}.`,
                link: `/tournaments/${tournament.id}`,
            })
        )
    );

    if (!tournament.entryFee || tournament.entryFee <= 0) {
        await syncOrCreateTournamentBracket(db, tournamentId, promotedIds);
    } else {
        const verified = await db.tournamentParticipant.findMany({
            where: { id: { in: promotedIds }, paymentStatus: "VERIFIED" },
            select: { id: true },
        });
        if (verified.length > 0) {
            await syncOrCreateTournamentBracket(
                db,
                tournamentId,
                verified.map((item) => item.id)
            );
        }
    }

    if (options.actorUserId) {
        await Promise.all(
            promotedIds.map((participantId) =>
                logAudit({
                    userId: options.actorUserId,
                    action: AUDIT_ACTIONS.TOURNAMENT_WAITLIST_PROMOTED,
                    targetId: participantId,
                    targetType: "TournamentParticipant",
                    details: { tournamentId },
                })
            )
        );
    }

    return { promotedCount: promotedIds.length, promotedIds };
}
