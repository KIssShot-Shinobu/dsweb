import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient, TournamentStructure } from "@prisma/client";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

type MatchRecord = {
    id: string;
    playerAId: string | null;
    playerBId: string | null;
    status: string;
    winnerId: string | null;
    bracketIndex: number;
};

function buildPrismaMock(options: {
    structure?: TournamentStructure;
    matches: MatchRecord[];
    participants: Array<{ id: string; seed: number | null; joinedAt: Date }>;
    roundsCount?: number;
}) {
    const roundsCount = options.roundsCount ?? (options.matches.length > 0 ? 1 : 0);
    const matchStore = new Map(options.matches.map((match) => [match.id, { ...match }]));

    const prisma = {
        tournament: {
            findUnique: async () => ({
                id: "tournament_1",
                structure: options.structure ?? "SINGLE_ELIM",
            }),
        },
        tournamentRound: {
            findFirst: async () => (roundsCount > 0 ? { id: "round_1" } : null),
            count: async () => roundsCount,
        },
        match: {
            findMany: async () => Array.from(matchStore.values()),
            update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                const current = matchStore.get(where.id);
                if (!current) return null;
                const next = { ...current, ...data };
                matchStore.set(where.id, next as MatchRecord);
                return next;
            },
        },
        matchPlayer: {
            createMany: async () => ({ count: 0 }),
        },
        matchResult: {
            create: async () => null,
        },
        tournamentParticipant: {
            findMany: async () => options.participants,
        },
        $transaction: async (callback: (tx: PrismaClient) => unknown) => callback(prisma as unknown as PrismaClient),
    } as unknown as PrismaClient;

    return { prisma, matchStore };
}

test("syncTournamentRosterToBracket fills empty round one slots and marks READY", async () => {
    const { syncTournamentRosterToBracket } = await import("@/lib/services/tournament-bracket.service");
    const { prisma, matchStore } = buildPrismaMock({
        matches: [
            { id: "match_1", playerAId: null, playerBId: "participant_b", status: "PENDING", winnerId: null, bracketIndex: 1 },
            { id: "match_2", playerAId: "participant_c", playerBId: "participant_d", status: "READY", winnerId: null, bracketIndex: 2 },
        ],
        participants: [
            { id: "participant_a", seed: 1, joinedAt: new Date("2026-03-10T08:00:00.000Z") },
            { id: "participant_e", seed: 2, joinedAt: new Date("2026-03-10T09:00:00.000Z") },
        ],
    });

    const result = await syncTournamentRosterToBracket(prisma, "tournament_1", ["participant_a", "participant_e"]);

    const updated = matchStore.get("match_1");
    assert.equal(updated?.playerAId, "participant_a");
    assert.equal(updated?.playerBId, "participant_b");
    assert.equal(updated?.status, "READY");
    assert.equal(result.syncedCount, 1);
    assert.equal(result.pendingCount, 1);
});

test("syncTournamentRosterToBracket skips completed matches and keeps existing players", async () => {
    const { syncTournamentRosterToBracket } = await import("@/lib/services/tournament-bracket.service");
    const { prisma, matchStore } = buildPrismaMock({
        matches: [
            { id: "match_1", playerAId: "participant_a", playerBId: "participant_b", status: "READY", winnerId: null, bracketIndex: 1 },
            { id: "match_2", playerAId: null, playerBId: null, status: "COMPLETED", winnerId: "participant_x", bracketIndex: 2 },
            { id: "match_3", playerAId: null, playerBId: null, status: "PENDING", winnerId: null, bracketIndex: 3 },
        ],
        participants: [
            { id: "participant_c", seed: null, joinedAt: new Date("2026-03-10T10:00:00.000Z") },
        ],
    });

    const result = await syncTournamentRosterToBracket(prisma, "tournament_1", ["participant_c"]);

    const unchanged = matchStore.get("match_1");
    const completed = matchStore.get("match_2");
    const filled = matchStore.get("match_3");

    assert.equal(unchanged?.playerAId, "participant_a");
    assert.equal(completed?.winnerId, "participant_x");
    assert.equal(filled?.playerAId, "participant_c");
    assert.equal(result.syncedCount, 1);
    assert.equal(result.pendingCount, 0);
});

test("syncOrCreateTournamentBracket returns pending when participants are below minimum", async () => {
    const { syncOrCreateTournamentBracket } = await import("@/lib/services/tournament-bracket.service");
    const { prisma } = buildPrismaMock({
        roundsCount: 0,
        matches: [],
        participants: [{ id: "participant_a", seed: null, joinedAt: new Date("2026-03-10T10:00:00.000Z") }],
    });

    const result = await syncOrCreateTournamentBracket(prisma, "tournament_1");

    assert.equal(result.created, false);
    assert.equal(result.syncedCount, 0);
    assert.equal(result.pendingCount, 1);
});

test("syncOrCreateTournamentBracket syncs when bracket already exists", async () => {
    const { syncOrCreateTournamentBracket } = await import("@/lib/services/tournament-bracket.service");
    const { prisma, matchStore } = buildPrismaMock({
        roundsCount: 1,
        matches: [
            { id: "match_1", playerAId: null, playerBId: null, status: "PENDING", winnerId: null, bracketIndex: 1 },
        ],
        participants: [{ id: "participant_a", seed: 1, joinedAt: new Date("2026-03-10T10:00:00.000Z") }],
    });

    const result = await syncOrCreateTournamentBracket(prisma, "tournament_1", ["participant_a"]);

    const updated = matchStore.get("match_1");
    assert.equal(updated?.playerAId, "participant_a");
    assert.equal(result.created, false);
    assert.equal(result.syncedCount, 1);
    assert.equal(result.pendingCount, 0);
});
