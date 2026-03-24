import test from "node:test";
import assert from "node:assert/strict";
import { isLineupLocked, isValidLineupSize, normalizeLineupMemberIds } from "@/lib/match-lineup";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("isLineupLocked returns true for locked statuses", () => {
    const lockedStatuses = ["ONGOING", "RESULT_SUBMITTED", "CONFIRMED", "DISPUTED", "COMPLETED"];
    lockedStatuses.forEach((status) => assert.equal(isLineupLocked(status), true));
    assert.equal(isLineupLocked("PENDING"), false);
    assert.equal(isLineupLocked("READY"), false);
});

test("normalizeLineupMemberIds removes duplicates", () => {
    const normalized = normalizeLineupMemberIds(["user1", "user2", "user1"]);
    assert.deepEqual(normalized.sort(), ["user1", "user2"]);
});

test("isValidLineupSize validates exact size", () => {
    assert.equal(isValidLineupSize(["a", "b", "c"], 3), true);
    assert.equal(isValidLineupSize(["a", "b"], 3), false);
});
