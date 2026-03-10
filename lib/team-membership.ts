import type { Prisma } from "@prisma/client";

export const activeTeamMembershipSelect = {
    teamMemberships: {
        where: { leftAt: null },
        orderBy: { joinedAt: "asc" },
        take: 1,
        select: {
            joinedAt: true,
            role: true,
            team: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    isActive: true,
                },
            },
        },
    },
} satisfies Prisma.UserSelect;

type UserWithActiveMembership = {
    teamMemberships?: Array<{
        joinedAt: Date;
        role: string;
        team: {
            id: string;
            name: string;
            slug: string;
            isActive: boolean;
        };
    }>;
};

export function getActiveTeamSnapshot(user: UserWithActiveMembership) {
    const activeMembership = user.teamMemberships?.[0] ?? null;

    return {
        teamId: activeMembership?.team.id ?? null,
        teamJoinedAt: activeMembership?.joinedAt ?? null,
        team: activeMembership?.team ?? null,
        teamMembershipRole: activeMembership?.role ?? null,
    };
}
