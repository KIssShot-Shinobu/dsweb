import test from "node:test";
import assert from "node:assert/strict";
import { buildIcsEvent } from "@/lib/ics";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("buildIcsEvent outputs UTC DTSTART/DTEND", () => {
    const start = new Date("2026-03-20T12:00:00.000Z");
    const end = new Date("2026-03-20T13:00:00.000Z");
    const ics = buildIcsEvent({
        uid: "match-123@dsweb",
        summary: "Match A vs B",
        start,
        end,
    });

    assert.ok(ics.includes("DTSTART:20260320T120000Z"));
    assert.ok(ics.includes("DTEND:20260320T130000Z"));
    assert.ok(ics.includes("SUMMARY:Match A vs B"));
});
