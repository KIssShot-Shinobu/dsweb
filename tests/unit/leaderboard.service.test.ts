import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { applyLeaderboardForMatch, calculateElo } from "@/lib/services/leaderboard.service";

process.env.LEADERBOARD_K_FACTOR ??= "32";
process.env.LEADERBOARD_DEFAULT_ELO ??= "1500";

type LeaderboardEntryRecord = {
    id: string;
    userId: string;
    seasonId: string | null;
    gameId: string | null;
    eloRating: number;
    placementMatchesPlayed: number;
    rankTier: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    lastMatchAt: Date | null;
};

type TeamLeaderboardEntryRecord = {
    id: string;
    teamId: string;
    seasonId: string | null;
    gameId: string | null;
    eloRating: number;
    wins: number;
    losses: number;
    matchesPlayed: number;
    lastMatchAt: Date | null;
};

type LeaderboardHistoryRecord = {
    userId?: string | null;
    teamId?: string | null;
    matchId?: string | null;
    seasonId?: string | null;
    gameId?: string | null;
    eloBefore: number;
    eloAfter: number;
    delta: number;
    createdAt: Date;
};

function applyEntryUpdate(entry: LeaderboardEntryRecord | TeamLeaderboardEntryRecord, data: Record<string, unknown>) {
    const applyNumber = (current: number, value: unknown) => {
        if (typeof value === "number") return value;
        if (value && typeof value === "object" && "increment" in value && typeof (value as { increment: number }).increment === "number") {
            return current + (value as { increment: number }).increment;
        }
        return current;
    };

    if ("eloRating" in data) {
        entry.eloRating = applyNumber(entry.eloRating, data.eloRating);
    }
    if ("wins" in data) {
        entry.wins = applyNumber(entry.wins, data.wins);
    }
    if ("losses" in data) {
        entry.losses = applyNumber(entry.losses, data.losses);
    }
    if ("matchesPlayed" in data) {
        entry.matchesPlayed = applyNumber(entry.matchesPlayed, data.matchesPlayed);
    }
    if ("placementMatchesPlayed" in data) {
        entry.placementMatchesPlayed = applyNumber(entry.placementMatchesPlayed, data.placementMatchesPlayed);
    }
    if ("rankTier" in data && typeof data.rankTier === "string") {
        entry.rankTier = data.rankTier;
    }
    if (data.lastMatchAt instanceof Date) {
        entry.lastMatchAt = data.lastMatchAt;
    }
}

test("calculateElo returns expected ratings for equal players", () => {
    const result = calculateElo({
        ratingA: 1500,
        ratingB: 1500,
        scoreA: 1,
        matchesPlayedA: 30,
        matchesPlayedB: 30,
        placementMatchesPlayedA: 10,
        placementMatchesPlayedB: 10,
    });
    assert.ok(Math.abs(result.newRatingA - 1516) < 0.01);
    assert.ok(Math.abs(result.newRatingB - 1484) < 0.01);
});

test("applyLeaderboardForMatch updates individual leaderboard entries", async () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const leaderboardEntries: LeaderboardEntryRecord[] = [];
    const historyEntries: LeaderboardHistoryRecord[] = [];
    const matchResult = { leaderboardAppliedAt: null as Date | null };

    const prisma = {
        match: {
            findUnique: async () => ({
                id: "match_1",
                winnerId: "participant_a",
                playerAId: "participant_a",
                playerBId: "participant_b",
                playerA: { userId: "user_a", teamId: null },
                playerB: { userId: "user_b", teamId: null },
                tournament: { seasonId: "season_1", isTeamTournament: false, mode: "INDIVIDUAL", gameId: "game_1" },
            }),
        },
        matchResult: {
            update: async ({ data }: { data: { leaderboardAppliedAt: Date } }) => {
                matchResult.leaderboardAppliedAt = data.leaderboardAppliedAt;
                return matchResult;
            },
            count: async () => 0,
        },
        leaderboardEntry: {
            findFirst: async ({ where }: { where: { userId: string; seasonId: string | null; gameId: string | null } }) =>
                leaderboardEntries.find((entry) => entry.userId === where.userId && entry.seasonId === where.seasonId && entry.gameId === where.gameId) ?? null,
            create: async ({ data }: { data: { userId: string; seasonId: string | null; gameId: string | null; eloRating: number } }) => {
                const entry: LeaderboardEntryRecord = {
                    id: `le_${leaderboardEntries.length + 1}`,
                    userId: data.userId,
                    seasonId: data.seasonId ?? null,
                    gameId: data.gameId ?? null,
                    eloRating: data.eloRating,
                    placementMatchesPlayed: 0,
                    rankTier: "Gold",
                    wins: 0,
                    losses: 0,
                    matchesPlayed: 0,
                    lastMatchAt: null,
                };
                leaderboardEntries.push(entry);
                return entry;
            },
            update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                const entry = leaderboardEntries.find((item) => item.id === where.id);
                if (!entry) throw new Error("Entry not found");
                applyEntryUpdate(entry, data);
                return entry;
            },
            updateMany: async () => ({ count: 0 }),
        },
        teamLeaderboardEntry: {
            findFirst: async () => null,
            create: async () => ({ id: "team_entry" }),
            update: async () => ({ id: "team_entry" }),
        },
        matchLineup: {
            findMany: async () => [],
        },
        leaderboardHistory: {
            createMany: async ({ data }: { data: LeaderboardHistoryRecord[] }) => {
                historyEntries.push(...data);
                return { count: data.length };
            },
        },
        season: {
            findFirst: async () => null,
        },
    } as unknown as PrismaClient;

    await applyLeaderboardForMatch(prisma, "match_1", { now });

    const globalA = leaderboardEntries.find((entry) => entry.userId === "user_a" && entry.seasonId === null && entry.gameId === "game_1");
    const seasonalA = leaderboardEntries.find((entry) => entry.userId === "user_a" && entry.seasonId === "season_1" && entry.gameId === "game_1");
    const globalB = leaderboardEntries.find((entry) => entry.userId === "user_b" && entry.seasonId === null && entry.gameId === "game_1");
    const seasonalB = leaderboardEntries.find((entry) => entry.userId === "user_b" && entry.seasonId === "season_1" && entry.gameId === "game_1");

    assert.ok(globalA && seasonalA && globalB && seasonalB);
    assert.ok(Math.abs(globalA!.eloRating - 1525) < 0.01);
    assert.ok(Math.abs(globalB!.eloRating - 1475) < 0.01);
    assert.equal(globalA!.wins, 1);
    assert.equal(globalB!.losses, 1);
    assert.equal(globalA!.matchesPlayed, 1);
    assert.ok(matchResult.leaderboardAppliedAt?.toISOString() === now.toISOString());
    assert.equal(historyEntries.length, 4);
});

test("applyLeaderboardForMatch skips update when daily limit is reached", async () => {
    const now = new Date("2024-03-01T10:00:00.000Z");
    const leaderboardEntries: LeaderboardEntryRecord[] = [];
    const historyEntries: LeaderboardHistoryRecord[] = [];
    const matchResult = { leaderboardAppliedAt: null as Date | null };

    const prisma = {
        match: {
            findUnique: async () => ({
                id: "match_limit",
                winnerId: "participant_a",
                playerAId: "participant_a",
                playerBId: "participant_b",
                playerA: { userId: "user_a", teamId: null },
                playerB: { userId: "user_b", teamId: null },
                tournament: { seasonId: null, isTeamTournament: false, mode: "INDIVIDUAL", gameId: "game_1" },
            }),
        },
        matchResult: {
            update: async ({ data }: { data: { leaderboardAppliedAt: Date } }) => {
                matchResult.leaderboardAppliedAt = data.leaderboardAppliedAt;
                return matchResult;
            },
            count: async () => 5,
        },
        leaderboardEntry: {
            findFirst: async () => null,
            create: async () => {
                throw new Error("Leaderboard should not be updated when daily limit is reached.");
            },
            update: async () => {
                throw new Error("Leaderboard should not be updated when daily limit is reached.");
            },
            updateMany: async () => ({ count: 0 }),
        },
        teamLeaderboardEntry: {
            findFirst: async () => null,
            create: async () => {
                throw new Error("Team leaderboard should not be updated when daily limit is reached.");
            },
            update: async () => {
                throw new Error("Team leaderboard should not be updated when daily limit is reached.");
            },
        },
        matchLineup: {
            findMany: async () => [],
        },
        leaderboardHistory: {
            createMany: async ({ data }: { data: LeaderboardHistoryRecord[] }) => {
                historyEntries.push(...data);
                return { count: data.length };
            },
        },
        season: {
            findFirst: async () => null,
        },
    } as unknown as PrismaClient;

    const result = await applyLeaderboardForMatch(prisma, "match_limit", { now });

    assert.equal(result.applied, false);
    assert.equal(leaderboardEntries.length, 0);
    assert.equal(historyEntries.length, 0);
    assert.ok(matchResult.leaderboardAppliedAt?.toISOString() === now.toISOString());
});

test("applyLeaderboardForMatch updates team and lineup entries", async () => {
    const now = new Date("2024-02-01T00:00:00.000Z");
    const leaderboardEntries: LeaderboardEntryRecord[] = [];
    const teamLeaderboardEntries: TeamLeaderboardEntryRecord[] = [];
    const historyEntries: LeaderboardHistoryRecord[] = [];
    const matchResult = { leaderboardAppliedAt: null as Date | null };

    const prisma = {
        match: {
            findUnique: async () => ({
                id: "match_2",
                winnerId: "participant_a",
                playerAId: "participant_a",
                playerBId: "participant_b",
                playerA: { userId: null, teamId: "team_a" },
                playerB: { userId: null, teamId: "team_b" },
                tournament: { seasonId: null, isTeamTournament: true, mode: "TEAM_BOARD", gameId: "game_1" },
            }),
        },
        matchResult: {
            update: async ({ data }: { data: { leaderboardAppliedAt: Date } }) => {
                matchResult.leaderboardAppliedAt = data.leaderboardAppliedAt;
                return matchResult;
            },
            count: async () => 0,
        },
        leaderboardEntry: {
            findFirst: async ({ where }: { where: { userId: string; seasonId: string | null; gameId: string | null } }) =>
                leaderboardEntries.find((entry) => entry.userId === where.userId && entry.seasonId === where.seasonId && entry.gameId === where.gameId) ?? null,
            create: async ({ data }: { data: { userId: string; seasonId: string | null; gameId: string | null; eloRating: number } }) => {
                const entry: LeaderboardEntryRecord = {
                    id: `le_${leaderboardEntries.length + 1}`,
                    userId: data.userId,
                    seasonId: data.seasonId ?? null,
                    gameId: data.gameId ?? null,
                    eloRating: data.eloRating,
                    placementMatchesPlayed: 0,
                    rankTier: "Gold",
                    wins: 0,
                    losses: 0,
                    matchesPlayed: 0,
                    lastMatchAt: null,
                };
                leaderboardEntries.push(entry);
                return entry;
            },
            update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                const entry = leaderboardEntries.find((item) => item.id === where.id);
                if (!entry) throw new Error("Entry not found");
                applyEntryUpdate(entry, data);
                return entry;
            },
            updateMany: async ({ where, data }: { where: { userId: { in: string[] }; seasonId: string | null; gameId?: string | null }; data: Record<string, unknown> }) => {
                const targets = leaderboardEntries.filter(
                    (entry) => where.userId.in.includes(entry.userId) && entry.seasonId === where.seasonId && entry.gameId === (where.gameId ?? null)
                );
                targets.forEach((entry) => applyEntryUpdate(entry, data));
                return { count: targets.length };
            },
        },
        teamLeaderboardEntry: {
            findFirst: async ({ where }: { where: { teamId: string; seasonId: string | null; gameId: string | null } }) =>
                teamLeaderboardEntries.find((entry) => entry.teamId === where.teamId && entry.seasonId === where.seasonId && entry.gameId === where.gameId) ?? null,
            create: async ({ data }: { data: { teamId: string; seasonId: string | null; gameId: string | null; eloRating: number } }) => {
                const entry: TeamLeaderboardEntryRecord = {
                    id: `te_${teamLeaderboardEntries.length + 1}`,
                    teamId: data.teamId,
                    seasonId: data.seasonId ?? null,
                    gameId: data.gameId ?? null,
                    eloRating: data.eloRating,
                    wins: 0,
                    losses: 0,
                    matchesPlayed: 0,
                    lastMatchAt: null,
                };
                teamLeaderboardEntries.push(entry);
                return entry;
            },
            update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                const entry = teamLeaderboardEntries.find((item) => item.id === where.id);
                if (!entry) throw new Error("Team entry not found");
                applyEntryUpdate(entry, data);
                return entry;
            },
        },
        matchLineup: {
            findMany: async () => [
                { teamId: "team_a", memberIds: ["user_1", "user_2"] },
                { teamId: "team_b", memberIds: ["user_3", "user_4"] },
            ],
        },
        leaderboardHistory: {
            createMany: async ({ data }: { data: LeaderboardHistoryRecord[] }) => {
                historyEntries.push(...data);
                return { count: data.length };
            },
        },
        season: {
            findFirst: async () => null,
        },
    } as unknown as PrismaClient;

    await applyLeaderboardForMatch(prisma, "match_2", { now });

    const teamA = teamLeaderboardEntries.find((entry) => entry.teamId === "team_a" && entry.gameId === "game_1");
    const teamB = teamLeaderboardEntries.find((entry) => entry.teamId === "team_b" && entry.gameId === "game_1");
    assert.ok(teamA && teamB);
    assert.ok(Math.abs(teamA!.eloRating - 1520) < 0.01);
    assert.ok(Math.abs(teamB!.eloRating - 1480) < 0.01);
    assert.equal(teamA!.wins, 1);
    assert.equal(teamB!.losses, 1);

    const playerA = leaderboardEntries.find((entry) => entry.userId === "user_1" && entry.seasonId === null && entry.gameId === "game_1");
    const playerB = leaderboardEntries.find((entry) => entry.userId === "user_3" && entry.seasonId === null && entry.gameId === "game_1");
    assert.ok(playerA && playerB);
    assert.equal(playerA!.wins, 1);
    assert.equal(playerB!.losses, 1);
    assert.ok(matchResult.leaderboardAppliedAt?.toISOString() === now.toISOString());
    assert.equal(historyEntries.length, 6);
});
