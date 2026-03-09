import test from "node:test";
import assert from "node:assert/strict";
import { syncGoogleUser } from "@/lib/services/auth-oauth-service";

type MockUser = {
    id: string;
    email: string;
    username: string;
    fullName: string;
    role: "USER" | "MEMBER" | "OFFICER" | "ADMIN" | "FOUNDER";
    status: "ACTIVE" | "BANNED";
    teamId?: string | null;
    googleId?: string | null;
    avatarUrl?: string | null;
};

test("syncGoogleUser links an existing account by email", async () => {
    let updatedData: Record<string, unknown> | null = null;

    const result = await syncGoogleUser(
        {
            prisma: {
                user: {
                    findUnique: async ({ where }: { where: { googleId?: string; email?: string; username?: string } }) => {
                        if (where.googleId) return null;
                        if (where.email === "member@example.com") {
                            return {
                                id: "user_1",
                                email: "member@example.com",
                                username: "member.one",
                                fullName: "Member One",
                                role: "MEMBER",
                                status: "ACTIVE",
                                googleId: null,
                                avatarUrl: null,
                            } satisfies MockUser;
                        }
                        return null;
                    },
                    update: async ({ data }: { data: Record<string, unknown> }) => {
                        updatedData = data;
                        return {
                            id: "user_1",
                            email: "member@example.com",
                            username: "member.one",
                            fullName: "Member One",
                            role: "MEMBER",
                            status: "ACTIVE",
                            googleId: "google-sub-1",
                            avatarUrl: "https://avatar.example.com/u.png",
                        } satisfies MockUser;
                    },
                    create: async () => {
                        throw new Error("should not create");
                    },
                },
                emailVerificationToken: {
                    deleteMany: async () => null,
                },
            } as never,
            hashPassword: async () => "hashed",
            generateSecureToken: () => "token",
            now: () => new Date("2026-03-09T00:00:00.000Z"),
        },
        {
            googleId: "google-sub-1",
            email: "member@example.com",
            name: "Member One",
            image: "https://avatar.example.com/u.png",
            emailVerified: true,
        }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.outcome, "linked");
    }
    assert.equal(updatedData?.["googleId"], "google-sub-1");
});

test("syncGoogleUser creates a new public user when email is new", async () => {
    let createdData: Record<string, unknown> | null = null;

    const result = await syncGoogleUser(
        {
            prisma: {
                user: {
                    findUnique: async () => null,
                    update: async () => {
                        throw new Error("should not update");
                    },
                    create: async ({ data }: { data: Record<string, unknown> }) => {
                        createdData = data;
                        return {
                            id: "user_2",
                            email: "googleuser@example.com",
                            username: String(data.username),
                            fullName: String(data.fullName),
                            role: "USER",
                            status: "ACTIVE",
                            googleId: "google-sub-2",
                            avatarUrl: "https://avatar.example.com/google.png",
                        } satisfies MockUser;
                    },
                },
                emailVerificationToken: {
                    deleteMany: async () => null,
                },
            } as never,
            hashPassword: async (password) => `hashed:${password}`,
            generateSecureToken: () => "oauth-random-secret",
            now: () => new Date("2026-03-09T00:00:00.000Z"),
        },
        {
            googleId: "google-sub-2",
            email: "googleuser@example.com",
            name: "Google User",
            image: "https://avatar.example.com/google.png",
            emailVerified: true,
        }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.outcome, "created");
    }
    assert.equal(createdData?.["googleId"], "google-sub-2");
    assert.equal(createdData?.["role"], "USER");
    assert.equal(createdData?.["status"], "ACTIVE");
});

test("syncGoogleUser rejects banned users", async () => {
    const result = await syncGoogleUser(
        {
            prisma: {
                user: {
                    findUnique: async ({ where }: { where: { googleId?: string; email?: string } }) => {
                        if (where.googleId) return null;
                        return {
                            id: "user_3",
                            email: "banned@example.com",
                            username: "banned.user",
                            fullName: "Banned User",
                            role: "USER",
                            status: "BANNED",
                            googleId: null,
                            avatarUrl: null,
                        } satisfies MockUser;
                    },
                    update: async () => {
                        throw new Error("should not update");
                    },
                    create: async () => {
                        throw new Error("should not create");
                    },
                },
                emailVerificationToken: {
                    deleteMany: async () => null,
                },
            } as never,
            hashPassword: async () => "hashed",
            generateSecureToken: () => "token",
        },
        {
            googleId: "google-sub-3",
            email: "banned@example.com",
            name: "Banned User",
        }
    );

    assert.deepEqual(result, {
        ok: false,
        code: "BANNED",
        user: {
            id: "user_3",
            email: "banned@example.com",
            username: "banned.user",
            fullName: "Banned User",
            role: "USER",
            status: "BANNED",
            googleId: null,
            avatarUrl: null,
        },
    });
});
