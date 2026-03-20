import test from "node:test";
import assert from "node:assert/strict";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("buildGoogleCalendarUrl includes ctz and UTC dates", () => {
    const start = new Date("2026-03-20T12:00:00.000Z");
    const end = new Date("2026-03-20T13:00:00.000Z");
    const url = buildGoogleCalendarUrl({
        title: "Tournament X",
        start,
        end,
        timeZone: "Asia/Jakarta",
    });

    assert.ok(url.startsWith("https://calendar.google.com/calendar/render?"));
    assert.ok(url.includes("action=TEMPLATE"));
    assert.ok(url.includes("dates=20260320T120000Z%2F20260320T130000Z"));
    assert.ok(url.includes("ctz=Asia%2FJakarta"));
});
