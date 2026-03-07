import test from "node:test";
import assert from "node:assert/strict";
import { authenticateUser, registerUser } from "@/lib/services/auth-service";

test("auth flow integration: register then login against in-memory repository", async () => {
    let storedUser: any = null;
    let storedToken: any = null;

    const prisma = {
        user: {
            findUnique: async ({ where }: any) => {
                if (!storedUser) return null;
                if (where.email && where.email === storedUser.email) return storedUser;
                if (where.phoneWhatsapp && where.phoneWhatsapp === storedUser.phoneWhatsapp) return storedUser;
                return null;
            },
            create: async ({ data }: any) => {
                storedUser = { id: "user_int_1", ...data };
                return storedUser;
            },
            update: async () => storedUser,
        },
        gameProfile: {
            findFirst: async () => null,
        },
        emailVerificationToken: {
            upsert: async ({ create }: any) => {
                storedToken = create;
                return storedToken;
            },
        },
    };

    const registerResult = await registerUser(
        {
            prisma: prisma as any,
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
            duelLinksScreenshot: "",
            masterDuelScreenshot: "",
            sourceInfo: "Discord",
            prevGuild: "",
            guildStatus: "NEW_PLAYER",
            socialMedia: ["discord"],
            agreement: true,
        }
    );

    assert.equal(registerResult.ok, true);
    assert.equal(storedToken.token, "verify-token");

    const authResult = await authenticateUser(
        {
            prisma: prisma as any,
            comparePassword: async (password, hash) => hash === `hashed:${password}`,
        },
        {
            email: "integration@example.com",
            password: "Password123",
        }
    );

    assert.equal(authResult.ok, true);
});
