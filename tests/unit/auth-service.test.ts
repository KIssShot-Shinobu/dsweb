import test from "node:test";
import assert from "node:assert/strict";
import { authenticateUser, registerUser } from "@/lib/services/auth-service";

type AuthMockUser = {
    id: string;
    email: string;
    username: string;
    fullName: string;
    password?: string;
    status: string;
    role: string;
};

const baseRegisterInput = {
    fullName: "Test User",
    email: "test@example.com",
    password: "Password123",
    confirmPassword: "Password123",
};

test("authenticateUser returns user for valid credentials", async () => {
    const result = await authenticateUser(
        {
            prisma: {
                user: {
                    findUnique: async (): Promise<AuthMockUser> => ({
                        id: "user_1",
                        email: "user@example.com",
                        username: "user.one",
                        fullName: "User One",
                        password: "hashed",
                        status: "ACTIVE",
                        role: "USER",
                    }),
                },
            } as unknown as Parameters<typeof authenticateUser>[0]["prisma"],
            comparePassword: async () => true,
        },
        { identifier: "user@example.com", password: "secret" },
    );

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.user.id, "user_1");
    }
});

test("authenticateUser also accepts username as identifier", async () => {
    const result = await authenticateUser(
        {
            prisma: {
                user: {
                    findUnique: async (): Promise<AuthMockUser | null> => null,
                    findFirst: async (): Promise<AuthMockUser> => ({
                        id: "user_1",
                        email: "user@example.com",
                        username: "user.one",
                        fullName: "User One",
                        password: "hashed",
                        status: "ACTIVE",
                        role: "USER",
                    }),
                },
            } as unknown as Parameters<typeof authenticateUser>[0]["prisma"],
            comparePassword: async () => true,
        },
        { identifier: "user.one", password: "secret" },
    );

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.user.username, "user.one");
    }
});

test("authenticateUser blocks banned non-admin user", async () => {
    const result = await authenticateUser(
        {
            prisma: {
                user: {
                    findUnique: async (): Promise<AuthMockUser> => ({
                        id: "user_2",
                        email: "banned@example.com",
                        username: "banned.user",
                        fullName: "Banned User",
                        password: "hashed",
                        status: "BANNED",
                        role: "USER",
                    }),
                },
            } as unknown as Parameters<typeof authenticateUser>[0]["prisma"],
            comparePassword: async () => true,
        },
        { identifier: "banned@example.com", password: "secret" },
    );

    assert.deepEqual(result, { ok: false, code: "BANNED", userId: "user_2" });
});

test("registerUser rejects duplicate email", async () => {
    const result = await registerUser(
        {
            prisma: {
                user: {
                    findUnique: async (args: { where: { username?: string; email?: string } }) =>
                        args.where.email
                            ? {
                                  id: "user_dup",
                                  email: "existing@example.com",
                                  username: "existing.user",
                                  fullName: "Existing User",
                                  status: "ACTIVE",
                                  role: "USER",
                              }
                            : null,
                    create: async () => {
                        throw new Error("should not create");
                    },
                    update: async () => null,
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
            ...baseRegisterInput,
            email: "existing@example.com",
        },
    );

    assert.deepEqual(result, { ok: false, code: "EMAIL_EXISTS" });
});
