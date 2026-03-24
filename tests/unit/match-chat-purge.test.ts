import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("resolveMatchResult purges chat attachments after completion", async () => {
    const deletedUrls: string[] = [];
    const updateCalls: Array<Record<string, unknown>> = [];

    const { resolveMatchResult } = await import("@/lib/services/tournament-bracket.service");

    const prisma = {
        match: {
            update: async () => ({ id: "match_1" }),
            findUnique: async () => ({
                id: "match_1",
                winnerId: null,
                playerAId: null,
                playerBId: null,
                nextMatchId: null,
                nextMatchSide: null,
                loserNextMatchId: null,
                loserNextMatchSide: null,
                tournamentId: "tournament_1",
                round: { type: "MAIN", roundNumber: 1 },
            }),
        },
        matchResult: {
            upsert: async () => ({ id: "match_1" }),
        },
        matchMessage: {
            findMany: async () => [
                { id: "msg_1", attachmentUrls: ["/uploads/a.png", "/uploads/b.png"] },
                { id: "msg_2", attachmentUrls: ["/uploads/c.png"] },
            ],
            updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                updateCalls.push(data);
                return { count: 2 };
            },
        },
        $transaction: async (callback: (tx: PrismaClient) => unknown) => callback(prisma as unknown as PrismaClient),
    } as unknown as PrismaClient;

    await resolveMatchResult(
        prisma,
        "match_1",
        {
            scoreA: 2,
            scoreB: 0,
            winnerId: "participant_1",
            source: "SYSTEM",
        },
        {
            deleteUploadFileByUrl: async (url?: string | null) => {
                if (url) deletedUrls.push(url);
            },
        }
    );

    assert.deepEqual(deletedUrls.sort(), ["/uploads/a.png", "/uploads/b.png", "/uploads/c.png"].sort());
    assert.equal(updateCalls.length, 1);
    assert.deepEqual(updateCalls[0], { attachmentUrls: [] });
});
