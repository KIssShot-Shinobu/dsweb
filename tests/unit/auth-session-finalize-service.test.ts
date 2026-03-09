import test from "node:test";
import assert from "node:assert/strict";
import { finalizeAuthenticatedSession } from "@/lib/services/auth-session-finalize-service";

test("finalizeAuthenticatedSession issues internal session for active user", async () => {
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
                    }),
                    update: async () => {
                        calls.push("update");
                        return null;
                    },
                },
            },
            signToken: async () => {
                calls.push("signToken");
                return "signed-token";
            },
            setAuthCookie: async () => {
                calls.push("setAuthCookie");
            },
            clearRefreshCookie: async () => {
                calls.push("clearRefreshCookie");
            },
            createSession: async () => {
                calls.push("createSession");
                return { refreshToken: "refresh-token" };
            },
            setRefreshCookie: async () => {
                calls.push("setRefreshCookie");
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
    }
    assert.deepEqual(calls, [
        "update",
        "touchUserLastActiveAt",
        "signToken",
        "setAuthCookie",
        "createSession",
        "setRefreshCookie",
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
                    }),
                    update: async () => null,
                },
            },
            signToken: async () => "token",
            setAuthCookie: async () => undefined,
            clearRefreshCookie: async () => undefined,
            createSession: async () => ({ refreshToken: "refresh-token" }),
            setRefreshCookie: async () => undefined,
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
        },
    });
    assert.deepEqual(actions, ["LOGIN_FAILED"]);
});
