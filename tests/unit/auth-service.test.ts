import test from "node:test";
import assert from "node:assert/strict";
import { authenticateUser, registerUser } from "@/lib/services/auth-service";

type AuthMockUser = {
    id: string;
    email: string;
    fullName: string;
    password?: string;
    status: string;
    role: string;
};

test("authenticateUser returns user for valid credentials", async () => {
    const result = await authenticateUser(
        {
            prisma: {
                user: {
                    findUnique: async (): Promise<AuthMockUser> => ({
                        id: "user_1",
                        email: "user@example.com",
                        fullName: "User One",
                        password: "hashed",
                        status: "ACTIVE",
                        role: "USER",
                    }),
                },
            } as unknown as Parameters<typeof authenticateUser>[0]["prisma"],
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
                    findUnique: async (): Promise<AuthMockUser> => ({
                        id: "user_2",
                        email: "pending@example.com",
                        fullName: "Pending User",
                        password: "hashed",
                        status: "PENDING",
                        role: "USER",
                    }),
                },
            } as unknown as Parameters<typeof authenticateUser>[0]["prisma"],
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
                    findUnique: async (args: { where: { phoneWhatsapp?: string } }) => (args.where.phoneWhatsapp ? {
                        id: "user_3",
                        email: "existing@example.com",
                        fullName: "Existing User",
                        status: "ACTIVE",
                        role: "USER",
                    } : null),
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
            } as unknown as Parameters<typeof registerUser>[0]["prisma"],
            hashPassword: async () => "hashed",
            comparePassword: async () => false,
            generateSecureToken: () => "verify-token",
        },
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
            duelLinksScreenshotUploadId: "",
            masterDuelScreenshotUploadId: "",
            sourceInfo: "Discord",
            prevGuild: "",
            guildStatus: "NEW_PLAYER",
            socialMedia: ["discord"],
            agreement: true,
        }
    );

    assert.deepEqual(result, { ok: false, code: "PHONE_EXISTS" });
});
