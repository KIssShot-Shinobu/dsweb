import test from "node:test";
import assert from "node:assert/strict";
import { formatDisplayDateTimeInTimeZone, formatLocalDateTimeInTimeZone, parseLocalDateTimeInTimeZone } from "@/lib/datetime";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("parse/format local datetime stays consistent in tournament timezone", () => {
    const timeZone = "Asia/Jakarta";
    const input = "2026-03-20T19:30";
    const parsed = parseLocalDateTimeInTimeZone(input, timeZone);

    assert.ok(parsed instanceof Date);
    assert.equal(formatLocalDateTimeInTimeZone(parsed, timeZone), input);
    assert.ok(formatDisplayDateTimeInTimeZone(parsed, timeZone).length > 0);
});
