import test from "node:test";
import assert from "node:assert/strict";
import { authenticateUser, registerUser } from "@/lib/services/auth-service";

test("authenticateUser returns user for valid credentials", async () => {
    const result = await authenticateUser(
        {
            prisma: {
                user: {
                    findUnique: async () => ({
                        id: "user_1",
                        email: "user@example.com",
                        fullName: "User One",
                        password: "hashed",
                        status: "ACTIVE",
                        role: "USER",
                    }),
                },
            } as any,
            comparePassword: async () => true,
        },
        { email: "user@example.com", password: "secret" }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.user.id, "user_1");
    }
});

test("authenticateUser blocks pending non-admin user", async () => {
    const result = await authenticateUser(
        {
            prisma: {
                user: {
                    findUnique: async () => ({
                        id: "user_2",
                        email: "pending@example.com",
                        fullName: "Pending User",
                        password: "hashed",
                        status: "PENDING",
                        role: "USER",
                    }),
                },
            } as any,
            comparePassword: async () => true,
        },
        { email: "pending@example.com", password: "secret" }
    );

    assert.deepEqual(result, { ok: false, code: "PENDING", userId: "user_2" });
});

test("registerUser rejects duplicate phone number", async () => {
    const result = await registerUser(
        {
            prisma: {
                user: {
                    findUnique: async (args: any) => (args.where.phoneWhatsapp ? { id: "user_3" } : null),
                    create: async () => {
                        throw new Error("should not create");
                    },
                    update: async () => null,
                },
                gameProfile: {
                    findFirst: async () => null,
                },
                emailVerificationToken: {
                    upsert: async () => null,
                },
            },
            hashPassword: async () => "hashed",
            comparePassword: async () => false,
            generateSecureToken: () => "verify-token",
        } as any,
        {
            fullName: "Test User",
            email: "test@example.com",
            password: "Password123",
            confirmPassword: "Password123",
            phoneWhatsapp: "+628123456789",
            city: "Jakarta",
            duelLinksGameId: "dl-123",
            duelLinksIgn: "[DS] Test",
            masterDuelGameId: "",
            masterDuelIgn: "",
            duelLinksScreenshot: "",
            masterDuelScreenshot: "",
            sourceInfo: "Discord",
            prevGuild: "",
            guildStatus: "NEW_PLAYER",
            socialMedia: ["discord"],
            agreement: true,
        }
    );

    assert.deepEqual(result, { ok: false, code: "PHONE_EXISTS" });
});
