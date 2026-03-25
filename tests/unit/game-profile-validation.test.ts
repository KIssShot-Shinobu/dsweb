import test from "node:test";
import assert from "node:assert/strict";
import { updateGameProfileSchema } from "@/lib/validators";

test("updateGameProfileSchema enforces 9-digit format for Duel Links and Master Duel", () => {
    const duelLinks = updateGameProfileSchema.safeParse({
        gameType: "DUEL_LINKS",
        ign: "Player",
        gameId: "123456789",
    });
    assert.equal(duelLinks.success, true);
    assert.equal(duelLinks.success && duelLinks.data.gameId, "123-456-789");

    const masterDuel = updateGameProfileSchema.safeParse({
        gameType: "MASTER_DUEL",
        ign: "Player",
        gameId: "123-456-789",
    });
    assert.equal(masterDuel.success, true);

    const invalid = updateGameProfileSchema.safeParse({
        gameType: "DUEL_LINKS",
        ign: "Player",
        gameId: "ABC",
    });
    assert.equal(invalid.success, false);
});

test("updateGameProfileSchema allows flexible IDs for other games", () => {
    const generic = updateGameProfileSchema.safeParse({
        gameType: "POKEMON_TCG",
        ign: "Ash",
        gameId: "Ash Ketchum 01",
    });
    assert.equal(generic.success, true);
    assert.equal(generic.success && generic.data.gameId, "Ash Ketchum 01");
});
