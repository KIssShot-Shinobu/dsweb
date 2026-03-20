import test from "node:test";
import assert from "node:assert/strict";
import { matchAvailabilitySchema, matchAvailabilitySelectSchema } from "@/lib/validators";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("matchAvailabilitySchema enforces 1-3 slots", () => {
    const ok = matchAvailabilitySchema.safeParse({
        slots: ["2026-03-20T19:30", "2026-03-21T19:30", "2026-03-22T19:30"],
    });
    assert.equal(ok.success, true);

    const tooMany = matchAvailabilitySchema.safeParse({
        slots: ["2026-03-20T19:30", "2026-03-21T19:30", "2026-03-22T19:30", "2026-03-23T19:30"],
    });
    assert.equal(tooMany.success, false);

    const empty = matchAvailabilitySchema.safeParse({ slots: [] });
    assert.equal(empty.success, false);
});

test("matchAvailabilitySelectSchema enforces slot format", () => {
    const ok = matchAvailabilitySelectSchema.safeParse({ slot: "2026-03-20T19:30" });
    assert.equal(ok.success, true);

    const bad = matchAvailabilitySelectSchema.safeParse({ slot: "invalid" });
    assert.equal(bad.success, false);
});
