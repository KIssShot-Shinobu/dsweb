import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

function buildTeamRecord(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: "team_1",
        name: "Alpha Team",
        slug: "alpha-team",
        description: "Roster utama",
        logoUrl: null,
        isActive: true,
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        updatedAt: new Date("2026-03-10T08:00:00.000Z"),
        memberships: [
            {
                id: "member_1",
                role: "CAPTAIN",
                joinedAt: new Date("2026-03-10T08:00:00.000Z"),
                leftAt: null,
                userId: "user_1",
                teamId: "team_1",
                user: {
                    id: "user_1",
                    username: "captain.one",
                    fullName: "Captain One",
                    email: "captain@example.com",
                    avatarUrl: null,
                    role: "MEMBER",
                    status: "ACTIVE",
                },
            },
        ],
        invites: [],
        joinRequests: [],
        _count: {
            memberships: 1,
        },
        ...overrides,
    };
}

test("createTeam creates captain membership when user has no active team", async () => {
    const { createTeamService } = await import("@/lib/services/team.service");
    const auditCalls: Array<Record<string, unknown>> = [];

    const mockPrisma = {
        teamMember: {
            findFirst: async () => null,
        },
        team: {
            findMany: async () => [],
            findUnique: async () => null,
            create: async () => buildTeamRecord(),
        },
        teamInvite: {
            findFirst: async () => null,
            findUnique: async () => null,
            create: async () => null,
            update: async () => null,
        },
        teamJoinRequest: {
            findFirst: async () => null,
            create: async () => null,
            update: async () => null,
        },
        user: {
            findUnique: async () => null,
        },
        $transaction: async (callback: (tx: unknown) => unknown) => callback(mockPrisma),
    } as unknown as PrismaClient;

    const service = createTeamService({
        prisma: mockPrisma,
        audit: async (payload) => {
            auditCalls.push(payload as Record<string, unknown>);
        },
        notifications: {
            createNotification: async () => null,
            getUserNotifications: async () => ({ notifications: [], total: 0, page: 1, limit: 20 }),
            getUnreadCount: async () => 0,
            markAsRead: async () => null,
            markAllAsRead: async () => 0,
            deleteNotification: async () => true,
        },
    });

    const result = await service.createTeam("user_1", {
        name: "Alpha Team",
        slug: "alpha-team",
        description: "Roster utama",
        logoUrl: "",
    });

    assert.equal(result?.captain?.userId, "user_1");
    assert.equal(result?.permissions.canTransferCaptain, true);
    assert.equal(auditCalls.length, 1);
});

test("inviteUser rejects targets that already have an active team", async () => {
    const { createTeamService, TeamServiceError } = await import("@/lib/services/team.service");
    const mockPrisma = {
        teamMember: {
            findFirst: async (args: { where: Record<string, unknown> }) => {
                if (args.where.userId === "captain_1") {
                    return {
                        id: "member_captain",
                        role: "CAPTAIN",
                        joinedAt: new Date(),
                        leftAt: null,
                        userId: "captain_1",
                        teamId: "team_1",
                        user: {
                            id: "captain_1",
                            username: "captain.one",
                            fullName: "Captain One",
                            email: "captain@example.com",
                            avatarUrl: null,
                            role: "MEMBER",
                            status: "ACTIVE",
                        },
                    };
                }

                if (args.where.userId === "target_1") {
                    return {
                        id: "member_target",
                        role: "PLAYER",
                        joinedAt: new Date(),
                        leftAt: null,
                        userId: "target_1",
                        teamId: "team_2",
                        user: {
                            id: "target_1",
                            username: "target.one",
                            fullName: "Target One",
                            email: "target@example.com",
                            avatarUrl: null,
                            role: "MEMBER",
                            status: "ACTIVE",
                        },
                    };
                }

                return null;
            },
        },
        team: {
            findMany: async () => [],
            findUnique: async () => buildTeamRecord(),
            create: async () => buildTeamRecord(),
        },
        teamInvite: {
            findFirst: async () => null,
            findUnique: async () => null,
            create: async () => null,
            update: async () => null,
        },
        teamJoinRequest: {
            findFirst: async () => null,
            create: async () => null,
            update: async () => null,
        },
        user: {
            findUnique: async () => ({
                id: "target_1",
                fullName: "Target One",
                status: "ACTIVE",
            }),
        },
        $transaction: async (callback: (tx: unknown) => unknown) => callback(mockPrisma),
    } as unknown as PrismaClient;

    const service = createTeamService({
        prisma: mockPrisma,
        audit: async () => undefined,
        notifications: {
            createNotification: async () => null,
            getUserNotifications: async () => ({ notifications: [], total: 0, page: 1, limit: 20 }),
            getUnreadCount: async () => 0,
            markAsRead: async () => null,
            markAllAsRead: async () => 0,
            deleteNotification: async () => true,
        },
    });

    await assert.rejects(
        () =>
            service.inviteUser("captain_1", {
                teamId: "team_1",
                userId: "target_1",
            }),
        (error: unknown) => error instanceof TeamServiceError && error.status === 409
    );
});

test("deleteTeam allows captain when roster only has captain", async () => {
    const { createTeamService } = await import("@/lib/services/team.service");
    const auditCalls: Array<Record<string, unknown>> = [];
    let deleteCalled = false;

    const mockPrisma = {
        teamMember: {
            findFirst: async (args: { where: Record<string, unknown> }) => {
                if (args.where.userId === "captain_1") {
                    return {
                        id: "member_captain",
                        role: "CAPTAIN",
                        joinedAt: new Date(),
                        leftAt: null,
                        userId: "captain_1",
                        teamId: "team_1",
                        user: {
                            id: "captain_1",
                            username: "captain.one",
                            fullName: "Captain One",
                            email: "captain@example.com",
                            avatarUrl: null,
                            role: "MEMBER",
                            status: "ACTIVE",
                        },
                    };
                }

                return null;
            },
        },
        team: {
            findUnique: async () => buildTeamRecord({ memberships: [buildTeamRecord().memberships[0]] }),
            delete: async () => {
                deleteCalled = true;
                return { id: "team_1" };
            },
        },
    } as unknown as PrismaClient;

    const service = createTeamService({
        prisma: mockPrisma,
        audit: async (payload) => {
            auditCalls.push(payload as Record<string, unknown>);
        },
        notifications: {
            createNotification: async () => null,
            getUserNotifications: async () => ({ notifications: [], total: 0, page: 1, limit: 20 }),
            getUnreadCount: async () => 0,
            markAsRead: async () => null,
            markAllAsRead: async () => 0,
            deleteNotification: async () => true,
        },
    });

    const result = await service.deleteTeam("captain_1", { teamId: "team_1" });

    assert.equal(result.id, "team_1");
    assert.equal(deleteCalled, true);
    assert.equal(auditCalls.length, 1);
});

test("deleteTeam rejects non-captain role", async () => {
    const { createTeamService, TeamServiceError } = await import("@/lib/services/team.service");

    const mockPrisma = {
        teamMember: {
            findFirst: async () => ({
                id: "member_vc",
                role: "VICE_CAPTAIN",
                joinedAt: new Date(),
                leftAt: null,
                userId: "user_vc",
                teamId: "team_1",
                user: {
                    id: "user_vc",
                    username: "vice.one",
                    fullName: "Vice Captain",
                    email: "vice@example.com",
                    avatarUrl: null,
                    role: "MEMBER",
                    status: "ACTIVE",
                },
            }),
        },
        team: {
            findUnique: async () => buildTeamRecord(),
        },
    } as unknown as PrismaClient;

    const service = createTeamService({
        prisma: mockPrisma,
        audit: async () => undefined,
        notifications: {
            createNotification: async () => null,
            getUserNotifications: async () => ({ notifications: [], total: 0, page: 1, limit: 20 }),
            getUnreadCount: async () => 0,
            markAsRead: async () => null,
            markAllAsRead: async () => 0,
            deleteNotification: async () => true,
        },
    });

    await assert.rejects(
        () => service.deleteTeam("user_vc", { teamId: "team_1" }),
        (error: unknown) => error instanceof TeamServiceError && error.status === 403
    );
});

test("deleteTeam rejects when roster still has other members", async () => {
    const { createTeamService, TeamServiceError } = await import("@/lib/services/team.service");

    const mockPrisma = {
        teamMember: {
            findFirst: async () => ({
                id: "member_captain",
                role: "CAPTAIN",
                joinedAt: new Date(),
                leftAt: null,
                userId: "captain_1",
                teamId: "team_1",
                user: {
                    id: "captain_1",
                    username: "captain.one",
                    fullName: "Captain One",
                    email: "captain@example.com",
                    avatarUrl: null,
                    role: "MEMBER",
                    status: "ACTIVE",
                },
            }),
        },
        team: {
            findUnique: async () =>
                buildTeamRecord({
                    memberships: [
                        buildTeamRecord().memberships[0],
                        {
                            id: "member_player",
                            role: "PLAYER",
                            joinedAt: new Date(),
                            leftAt: null,
                            userId: "player_1",
                            teamId: "team_1",
                            user: {
                                id: "player_1",
                                username: "player.one",
                                fullName: "Player One",
                                email: "player@example.com",
                                avatarUrl: null,
                                role: "MEMBER",
                                status: "ACTIVE",
                            },
                        },
                    ],
                    _count: { memberships: 2 },
                }),
        },
    } as unknown as PrismaClient;

    const service = createTeamService({
        prisma: mockPrisma,
        audit: async () => undefined,
        notifications: {
            createNotification: async () => null,
            getUserNotifications: async () => ({ notifications: [], total: 0, page: 1, limit: 20 }),
            getUnreadCount: async () => 0,
            markAsRead: async () => null,
            markAllAsRead: async () => 0,
            deleteNotification: async () => true,
        },
    });

    await assert.rejects(
        () => service.deleteTeam("captain_1", { teamId: "team_1" }),
        (error: unknown) => error instanceof TeamServiceError && error.status === 400
    );
});
