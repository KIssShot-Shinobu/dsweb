import test from "node:test";
import assert from "node:assert/strict";
import { authenticateUser, registerUser } from "@/lib/services/auth-service";

type StoredUser = {
    id: string;
    email: string;
    fullName: string;
    password: string;
    phoneWhatsapp: string;
    city: string;
    status: string;
    role: string;
};

type VerificationToken = {
    userId: string;
    token: string;
    expiresAt: Date;
};

test("auth flow integration: register then login against in-memory repository", async () => {
    let storedUser: StoredUser | null = null;
    let storedToken: VerificationToken | null = null;

    const prisma = {
        user: {
            findUnique: async ({ where }: { where: { email?: string; phoneWhatsapp?: string } }) => {
                if (!storedUser) return null;
                if (where.email && where.email === storedUser.email) return storedUser;
                if (where.phoneWhatsapp && where.phoneWhatsapp === storedUser.phoneWhatsapp) return storedUser;
                return null;
            },
            create: async ({ data }: { data: Omit<StoredUser, "id"> }) => {
                storedUser = { id: "user_int_1", ...data };
                return storedUser;
            },
            update: async () => storedUser,
        },
        gameProfile: {
            findFirst: async () => null,
        },
        emailVerificationToken: {
            upsert: async ({ create }: { create: VerificationToken }) => {
                storedToken = create;
                return storedToken;
            },
        },
    } as const;

    const registerResult = await registerUser(
        {
            prisma: prisma as unknown as Parameters<typeof registerUser>[0]["prisma"],
            hashPassword: async (password) => `hashed:${password}`,
            comparePassword: async () => false,
            generateSecureToken: () => "verify-token",
        },
        {
            fullName: "Integration User",
            email: "integration@example.com",
            password: "Password123",
            confirmPassword: "Password123",
            phoneWhatsapp: "+628123456789",
            city: "Jakarta",
            duelLinksGameId: "dl-123",
            duelLinksIgn: "[DS] Integrator",
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

    assert.equal(registerResult.ok, true);
    assert.ok(storedToken);
    assert.equal((storedToken as VerificationToken).token, "verify-token");

    const authResult = await authenticateUser(
        {
            prisma: prisma as unknown as Parameters<typeof authenticateUser>[0]["prisma"],
            comparePassword: async (password, hash) => hash === `hashed:${password}`,
        },
        {
            email: "integration@example.com",
            password: "Password123",
        }
    );

    assert.equal(authResult.ok, true);
});
