import test from "node:test";
import assert from "node:assert/strict";
import { decryptValue, encryptValue, hashLookupValue, protectUserWriteData, unprotectUserRecord } from "@/lib/data-protection";

process.env.DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || "test-encryption-key";

test("encryptValue/decryptValue roundtrip", () => {
    const encrypted = encryptValue("+628123456789");
    assert.notEqual(encrypted, "+628123456789");
    assert.equal(decryptValue(encrypted), "+628123456789");
});

test("hashLookupValue is stable for normalized inputs", () => {
    assert.equal(hashLookupValue(" +628123456789 "), hashLookupValue("+628123456789"));
});

test("protectUserWriteData encrypts sensitive fields and writes lookup hashes", () => {
    const protectedUser = protectUserWriteData({
        phoneWhatsapp: "+628123456789",
        accountNumber: "1234567890",
        twoFactorSecret: "OTPSECRET",
    }) as Record<string, string>;

    assert.ok(String(protectedUser.phoneWhatsapp).startsWith("enc:v1:"));
    assert.ok(String(protectedUser.accountNumber).startsWith("enc:v1:"));
    assert.ok(String(protectedUser.twoFactorSecret).startsWith("enc:v1:"));
    assert.equal(protectedUser.phoneWhatsappHash, hashLookupValue("+628123456789"));
    assert.equal(protectedUser.accountNumberHash, hashLookupValue("1234567890"));

    const decrypted = unprotectUserRecord(protectedUser);
    assert.equal(decrypted.phoneWhatsapp, "+628123456789");
    assert.equal(decrypted.accountNumber, "1234567890");
    assert.equal(decrypted.twoFactorSecret, "OTPSECRET");
});
