import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { isTeamRosterLocked } from "@/lib/team-roster-lock";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("isTeamRosterLocked returns true when ongoing tournament exists", async () => {
    const prisma = {
        tournamentParticipant: {
            findFirst: async () => ({ id: "participant_1" }),
        },
    } as unknown as PrismaClient;

    const locked = await isTeamRosterLocked(prisma, "team_1");
    assert.equal(locked, true);
});

test("isTeamRosterLocked returns false when no ongoing tournament", async () => {
    const prisma = {
        tournamentParticipant: {
            findFirst: async () => null,
        },
    } as unknown as PrismaClient;

    const locked = await isTeamRosterLocked(prisma, "team_1");
    assert.equal(locked, false);
});
