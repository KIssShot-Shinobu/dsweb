import type { PrismaClient } from "@prisma/client";

const ACTIVE_PARTICIPANT_STATUSES = ["REGISTERED", "CHECKED_IN", "PLAYING"] as const;

export async function isTeamRosterLocked(prisma: PrismaClient, teamId: string) {
    const record = await prisma.tournamentParticipant.findFirst({
        where: {
            teamId,
            status: { in: ACTIVE_PARTICIPANT_STATUSES },
            tournament: { status: "ONGOING" },
        },
        select: { id: true },
    });

    return Boolean(record);
}

export type TeamRosterLockStatus = Awaited<ReturnType<typeof isTeamRosterLocked>>;
