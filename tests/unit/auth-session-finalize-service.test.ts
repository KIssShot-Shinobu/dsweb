import test from "node:test";
import assert from "node:assert/strict";
import { finalizeAuthenticatedSession } from "@/lib/services/auth-session-finalize-service";

test("finalizeAuthenticatedSession records successful login for active user", async () => {
    const calls: string[] = [];

    const result = await finalizeAuthenticatedSession(
        {
            prisma: {
                user: {
                    findUnique: async () => ({
                        id: "user_1",
                        email: "member@example.com",
                        username: "member.one",
                        fullName: "Member One",
                        role: "MEMBER",
                        status: "ACTIVE",
                        emailVerificationToken: null,
                    }),
                    update: async () => {
                        calls.push("update");
                        return null;
                    },
                },
            },
            touchUserLastActiveAt: async () => {
                calls.push("touchUserLastActiveAt");
            },
            logAudit: async ({ action }) => {
                calls.push(`audit:${action}`);
            },
            now: () => new Date("2026-03-09T00:00:00.000Z"),
        },
        {
            email: "member@example.com",
            provider: "credentials",
            redirectTarget: "/dashboard",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
        }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.user.username, "member.one");
        assert.equal(result.emailVerified, true);
    }
    assert.deepEqual(calls, [
        "update",
        "touchUserLastActiveAt",
        "audit:LOGIN_SUCCESS",
    ]);
});

test("finalizeAuthenticatedSession rejects banned user and logs failed login", async () => {
    const actions: string[] = [];

    const result = await finalizeAuthenticatedSession(
        {
            prisma: {
                user: {
                    findUnique: async () => ({
                        id: "user_2",
                        email: "banned@example.com",
                        username: "banned.user",
                        fullName: "Banned User",
                        role: "USER",
                        status: "BANNED",
                        emailVerificationToken: null,
                    }),
                    update: async () => null,
                },
            },
            touchUserLastActiveAt: async () => undefined,
            logAudit: async ({ action }) => {
                actions.push(action);
            },
        },
        {
            email: "banned@example.com",
            provider: "google",
            redirectTarget: "/dashboard",
        }
    );

    assert.deepEqual(result, {
        ok: false,
        code: "BANNED",
        user: {
            id: "user_2",
            email: "banned@example.com",
            username: "banned.user",
            fullName: "Banned User",
            role: "USER",
            status: "BANNED",
            emailVerificationToken: null,
        },
    });
    assert.deepEqual(actions, ["LOGIN_FAILED"]);
});

test("finalizeAuthenticatedSession sends verification notification when email unverified", async () => {
    const calls: string[] = [];

    const result = await finalizeAuthenticatedSession(
        {
            prisma: {
                user: {
                    findUnique: async () => ({
                        id: "user_3",
                        email: "unverified@example.com",
                        username: "unverified.user",
                        fullName: "Unverified User",
                        role: "USER",
                        status: "ACTIVE",
                        emailVerificationToken: { id: "token_1" },
                    }),
                    update: async () => {
                        calls.push("update");
                        return null;
                    },
                },
            },
            notifications: {
                createNotification: async (input) => {
                    calls.push(`notify:${input.type}:${input.title}`);
                    return null;
                },
            },
            touchUserLastActiveAt: async () => {
                calls.push("touchUserLastActiveAt");
            },
            logAudit: async ({ action }) => {
                calls.push(`audit:${action}`);
            },
        },
        {
            email: "unverified@example.com",
            provider: "credentials",
            redirectTarget: "/dashboard",
        }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.emailVerified, false);
    }
    assert.deepEqual(calls, [
        "update",
        "touchUserLastActiveAt",
        "notify:SYSTEM_ALERT:Verifikasi email kamu",
        "audit:LOGIN_SUCCESS",
    ]);
});
