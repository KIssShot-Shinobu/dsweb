import type {
    Prisma,
    PrismaClient,
    TeamInviteStatus,
    TeamJoinRequestStatus,
    TeamRole,
} from "@prisma/client";

type TeamDbClient = PrismaClient | Prisma.TransactionClient;

export const teamMemberSelect = {
    id: true,
    role: true,
    joinedAt: true,
    leftAt: true,
    userId: true,
    teamId: true,
    user: {
        select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            role: true,
            status: true,
        },
    },
} satisfies Prisma.TeamMemberSelect;

export const teamInviteSelect = {
    id: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    teamId: true,
    userId: true,
    invitedById: true,
    user: {
        select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            avatarUrl: true,
        },
    },
    invitedBy: {
        select: {
            id: true,
            username: true,
            fullName: true,
        },
    },
} satisfies Prisma.TeamInviteSelect;

export const teamJoinRequestSelect = {
    id: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    teamId: true,
    userId: true,
    user: {
        select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            avatarUrl: true,
        },
    },
} satisfies Prisma.TeamJoinRequestSelect;

export const teamDetailSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    logoUrl: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    memberships: {
        where: { leftAt: null },
        select: teamMemberSelect,
    },
    invites: {
        where: { status: "PENDING" },
        select: teamInviteSelect,
    },
    joinRequests: {
        where: { status: "PENDING" },
        select: teamJoinRequestSelect,
    },
    _count: {
        select: {
            memberships: {
                where: { leftAt: null },
            },
        },
    },
} satisfies Prisma.TeamSelect;

export function createTeamRepository(db: TeamDbClient) {
    return {
        listPublicTeams() {
            return db.team.findMany({
                where: { isActive: true },
                select: teamDetailSelect,
                orderBy: [{ createdAt: "desc" }],
            });
        },

        findTeamById(teamId: string) {
            return db.team.findUnique({
                where: { id: teamId },
                select: teamDetailSelect,
            });
        },

        findTeamBySlug(slug: string) {
            return db.team.findUnique({
                where: { slug },
                select: teamDetailSelect,
            });
        },

        findActiveMembershipByUserId(userId: string) {
            return db.teamMember.findFirst({
                where: {
                    userId,
                    leftAt: null,
                },
                select: teamMemberSelect,
            });
        },

        findActiveMembershipByTeamAndUser(teamId: string, userId: string) {
            return db.teamMember.findFirst({
                where: {
                    teamId,
                    userId,
                    leftAt: null,
                },
                select: teamMemberSelect,
            });
        },

        findActiveMemberById(memberId: string) {
            return db.teamMember.findFirst({
                where: {
                    id: memberId,
                    leftAt: null,
                },
                select: teamMemberSelect,
            });
        },

        findPendingInvite(teamId: string, userId: string) {
            return db.teamInvite.findFirst({
                where: {
                    teamId,
                    userId,
                    status: "PENDING",
                },
                select: teamInviteSelect,
            });
        },

        findInviteById(inviteId: string) {
            return db.teamInvite.findUnique({
                where: { id: inviteId },
                select: teamInviteSelect,
            });
        },

        findPendingJoinRequest(teamId: string, userId: string) {
            return db.teamJoinRequest.findFirst({
                where: {
                    teamId,
                    userId,
                    status: "PENDING",
                },
                select: teamJoinRequestSelect,
            });
        },

        findJoinRequestById(joinRequestId: string) {
            return db.teamJoinRequest.findUnique({
                where: { id: joinRequestId },
                select: teamJoinRequestSelect,
            });
        },

        createTeamWithCaptain(data: {
            name: string;
            slug: string;
            description?: string | null;
            logoUrl?: string | null;
            captainUserId: string;
        }) {
            return db.team.create({
                data: {
                    name: data.name,
                    slug: data.slug,
                    description: data.description ?? null,
                    logoUrl: data.logoUrl ?? null,
                    memberships: {
                        create: {
                            userId: data.captainUserId,
                            role: "CAPTAIN",
                        },
                    },
                },
                select: teamDetailSelect,
            });
        },

        createInvite(data: { teamId: string; userId: string; invitedById: string }) {
            return db.teamInvite.create({
                data: {
                    teamId: data.teamId,
                    userId: data.userId,
                    invitedById: data.invitedById,
                },
                select: teamInviteSelect,
            });
        },

        updateInviteStatus(inviteId: string, status: TeamInviteStatus) {
            return db.teamInvite.update({
                where: { id: inviteId },
                data: { status },
                select: teamInviteSelect,
            });
        },

        createJoinRequest(data: { teamId: string; userId: string }) {
            return db.teamJoinRequest.create({
                data,
                select: teamJoinRequestSelect,
            });
        },

        updateJoinRequestStatus(joinRequestId: string, status: TeamJoinRequestStatus) {
            return db.teamJoinRequest.update({
                where: { id: joinRequestId },
                data: { status },
                select: teamJoinRequestSelect,
            });
        },

        createMembership(data: { teamId: string; userId: string; role?: TeamRole }) {
            return db.teamMember.create({
                data: {
                    teamId: data.teamId,
                    userId: data.userId,
                    role: data.role ?? "PLAYER",
                },
                select: teamMemberSelect,
            });
        },

        reactivateMembership(memberId: string, role: TeamRole) {
            return db.teamMember.update({
                where: { id: memberId },
                data: {
                    role,
                    leftAt: null,
                    joinedAt: new Date(),
                },
                select: teamMemberSelect,
            });
        },

        findMembershipRecord(teamId: string, userId: string) {
            return db.teamMember.findUnique({
                where: {
                    userId_teamId: {
                        userId,
                        teamId,
                    },
                },
                select: teamMemberSelect,
            });
        },

        updateMemberRole(memberId: string, role: TeamRole) {
            return db.teamMember.update({
                where: { id: memberId },
                data: { role },
                select: teamMemberSelect,
            });
        },

        markMembershipLeft(memberId: string) {
            return db.teamMember.update({
                where: { id: memberId },
                data: { leftAt: new Date() },
                select: teamMemberSelect,
            });
        },

        updateTeam(teamId: string, data: { name?: string; slug?: string; description?: string | null; logoUrl?: string | null }) {
            return db.team.update({
                where: { id: teamId },
                data,
                select: teamDetailSelect,
            });
        },

        deleteTeam(teamId: string) {
            return db.team.delete({
                where: { id: teamId },
            });
        },
    };
}

export type TeamRepository = ReturnType<typeof createTeamRepository>;
