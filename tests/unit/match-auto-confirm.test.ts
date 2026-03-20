import test from "node:test";
import assert from "node:assert/strict";
import { getAutoConfirmCandidates } from "@/lib/services/match-auto-confirm";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("getAutoConfirmCandidates picks matches with single report older than cutoff", () => {
    const cutoff = new Date("2026-03-20T10:00:00.000Z");
    const matches = [
        {
            id: "match_1",
            tournamentId: "tournament_1",
            reports: [
                { reportedById: "user_1", scoreA: 2, scoreB: 0, winnerId: "p1", createdAt: new Date("2026-03-20T08:00:00.000Z") },
            ],
        },
        {
            id: "match_2",
            tournamentId: "tournament_1",
            reports: [
                { reportedById: "user_2", scoreA: 2, scoreB: 1, winnerId: "p2", createdAt: new Date("2026-03-20T11:00:00.000Z") },
            ],
        },
        {
            id: "match_3",
            tournamentId: "tournament_1",
            reports: [
                { reportedById: "user_3", scoreA: 2, scoreB: 1, winnerId: "p3", createdAt: new Date("2026-03-20T08:30:00.000Z") },
                { reportedById: "user_4", scoreA: 2, scoreB: 1, winnerId: "p3", createdAt: new Date("2026-03-20T08:40:00.000Z") },
            ],
        },
    ];

    const candidates = getAutoConfirmCandidates(matches, cutoff);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, "match_1");
});
