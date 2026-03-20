import test from "node:test";
import assert from "node:assert/strict";
import { matchMessageSchema, matchMessageUpdateSchema } from "@/lib/validators";

process.env.DATABASE_URL ??= "mysql://user:pass@127.0.0.1:3306/test";

test("matchMessageSchema enforces content and max 3 attachments", () => {
    const ok = matchMessageSchema.safeParse({
        content: "Halo",
        attachmentUrls: ["/uploads/a.png", "/uploads/b.png", "/uploads/c.png"],
    });
    assert.equal(ok.success, true);

    const tooMany = matchMessageSchema.safeParse({
        content: "Halo",
        attachmentUrls: ["/uploads/1.png", "/uploads/2.png", "/uploads/3.png", "/uploads/4.png"],
    });
    assert.equal(tooMany.success, false);

    const missingContent = matchMessageSchema.safeParse({
        content: "   ",
    });
    assert.equal(missingContent.success, false);
});

test("matchMessageUpdateSchema requires at least one field", () => {
    const empty = matchMessageUpdateSchema.safeParse({});
    assert.equal(empty.success, false);

    const ok = matchMessageUpdateSchema.safeParse({ content: "Update" });
    assert.equal(ok.success, true);
});
