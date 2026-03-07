import test from "node:test";
import assert from "node:assert/strict";
import { createTreasuryEntry } from "@/lib/services/treasury-service";

test("createTreasuryEntry stores outgoing transaction as negative amount", async () => {
    const transaction = await createTreasuryEntry(
        {
            treasury: {
                create: async (args: any) => args.data,
            },
        },
        {
            type: "KELUAR",
            amount: 25000,
            description: "Beli hadiah",
            userId: "cm1234567890123456789012",
        }
    );

    assert.equal(transaction.amount, -25000);
    assert.equal(transaction.userId, "cm1234567890123456789012");
});
