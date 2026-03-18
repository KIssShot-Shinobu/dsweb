import { type PrismaClient } from "@prisma/client";

type ParticipantRef = {
    userId: string | null;
    teamId: string | null;
};

const TEAM_NOTIFY_ROLES = ["CAPTAIN", "VICE_CAPTAIN", "MANAGER"] as const;

export async function resolveMatchNotificationRecipients(
    prisma: PrismaClient,
    tournamentId: string,
    participants: ParticipantRef[]
) {
    const userIds = new Set<string>();
    const teamIds = new Set<string>();

    participants.forEach((participant) => {
        if (participant.userId) userIds.add(participant.userId);
        if (participant.teamId) teamIds.add(participant.teamId);
    });

    if (teamIds.size > 0) {
        const teamMembers = await prisma.teamMember.findMany({
            where: {
                teamId: { in: Array.from(teamIds) },
                leftAt: null,
                role: { in: TEAM_NOTIFY_ROLES },
            },
            select: { userId: true },
        });
        teamMembers.forEach((member) => userIds.add(member.userId));
    }

    const referees = await prisma.tournamentStaff.findMany({
        where: {
            tournamentId,
            role: "REFEREE",
        },
        select: { userId: true },
    });
    referees.forEach((staff) => userIds.add(staff.userId));

    return Array.from(userIds);
}
