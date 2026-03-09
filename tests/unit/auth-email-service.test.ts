import test from "node:test";
import assert from "node:assert/strict";
import {
    requestPasswordReset,
    resendVerificationEmail,
    resetPasswordWithToken,
    verifyEmailToken,
} from "@/lib/services/auth-email-service";

test("requestPasswordReset upserts token, logs audit, and returns debug URL", async () => {
    const sentEmails: Array<{ to: string; subject: string; text: string; html?: string }> = [];
    const auditLogs: Array<{ action: string; details?: Record<string, unknown> }> = [];
    let createdUserId = "";
    let createdToken = "";

    const result = await requestPasswordReset(
        {
            prisma: {
                user: {
                    findUnique: async () => ({
                        id: "user_1",
                        email: "user@example.com",
                        fullName: "User One",
                    }),
                    update: async () => null,
                },
                passwordResetToken: {
                    upsert: async (args) => {
                        createdUserId = args.create.userId;
                        createdToken = args.create.token;
                        return null;
                    },
                    findUnique: async () => null,
                    update: async () => null,
                    deleteMany: async () => null,
                },
                $transaction: async () => [],
            },
            sendEmail: async (input) => {
                sentEmails.push(input);
            },
            logAudit: async (input) => {
                auditLogs.push(input);
            },
            generateSecureToken: () => "reset-token",
            hashPassword: async () => "hashed",
            revokeAllUserSessions: async () => undefined,
            getAppUrl: () => "http://localhost:5116",
            passwordResetTokenTtlMs: 15 * 60 * 1000,
            includeDebugUrl: true,
            now: () => new Date("2026-03-08T10:00:00.000Z"),
        },
        "user@example.com"
    );

    assert.equal(result.success, true);
    assert.equal(result.debugUrl, "http://localhost:5116/reset-password?token=reset-token");
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0]?.subject, "Reset Password Duel Standby");
    assert.match(sentEmails[0]?.html || "", /Reset Password/);
    assert.equal(createdUserId, "user_1");
    assert.equal(createdToken, "reset-token");
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0]?.action, "PASSWORD_RESET_REQUEST");
});

test("requestPasswordReset keeps generic success for unknown email", async () => {
    const auditLogs: Array<{ action: string; details?: Record<string, unknown> }> = [];

    const result = await requestPasswordReset(
        {
            prisma: {
                user: {
                    findUnique: async () => null,
                    update: async () => null,
                },
                passwordResetToken: {
                    upsert: async () => null,
                    findUnique: async () => null,
                    update: async () => null,
                    deleteMany: async () => null,
                },
                $transaction: async () => [],
            },
            sendEmail: async () => {
                throw new Error("should not send");
            },
            logAudit: async (input) => {
                auditLogs.push(input);
            },
            generateSecureToken: () => "reset-token",
            hashPassword: async () => "hashed",
            revokeAllUserSessions: async () => undefined,
            getAppUrl: () => "http://localhost:5116",
            passwordResetTokenTtlMs: 15 * 60 * 1000,
        },
        "missing@example.com"
    );

    assert.deepEqual(result, {
        success: true,
        message: "Jika email terdaftar, link reset sudah dikirim.",
    });
    assert.equal(auditLogs[0]?.action, "PASSWORD_RESET_REQUEST");
    assert.equal(auditLogs[0]?.details?.userFound, false);
});

test("resetPasswordWithToken hashes password, revokes sessions, and logs audit", async () => {
    const auditLogs: Array<{ action: string; userId?: string }> = [];
    let sessionsRevokedFor: string | null = null;

    const result = await resetPasswordWithToken(
        {
            prisma: {
                user: {
                    findUnique: async () => null,
                    update: async () => ({ id: "user_1" }),
                },
                passwordResetToken: {
                    upsert: async () => null,
                    findUnique: async () => ({
                        id: "reset_1",
                        userId: "user_1",
                        used: false,
                        expiresAt: new Date("2026-03-08T10:15:00.000Z"),
                        user: {
                            id: "user_1",
                            email: "user@example.com",
                            fullName: "User One",
                        },
                    }),
                    update: async () => ({ id: "reset_1" }),
                    deleteMany: async () => ({ count: 0 }),
                },
                $transaction: async () => [],
            },
            sendEmail: async () => undefined,
            logAudit: async (input) => {
                auditLogs.push(input);
            },
            generateSecureToken: () => "unused",
            hashPassword: async (password) => `hashed:${password}`,
            revokeAllUserSessions: async (userId) => {
                sessionsRevokedFor = userId;
            },
            getAppUrl: () => "http://localhost:5116",
            passwordResetTokenTtlMs: 15 * 60 * 1000,
            now: () => new Date("2026-03-08T10:00:00.000Z"),
        },
        {
            token: "reset-token",
            password: "Password123",
        }
    );

    assert.deepEqual(result, {
        success: true,
        message: "Password berhasil direset. Silakan login ulang.",
    });
    assert.equal(sessionsRevokedFor, "user_1");
    assert.equal(auditLogs[0]?.action, "PASSWORD_RESET_SUCCESS");
});

test("verifyEmailToken rejects expired token", async () => {
    const result = await verifyEmailToken(
        {
            prisma: {
                user: {
                    update: async () => null,
                },
                emailVerificationToken: {
                    findUnique: async () => ({
                        id: "verify_1",
                        userId: "user_1",
                        expiresAt: new Date("2026-03-08T09:00:00.000Z"),
                        user: {
                            id: "user_1",
                            email: "user@example.com",
                            status: "ACTIVE",
                        },
                    }),
                    upsert: async () => null,
                    delete: async () => null,
                },
                $transaction: async () => [],
            },
            sendEmail: async () => undefined,
            logAudit: async () => undefined,
            generateSecureToken: () => "verify-token",
            getAppUrl: () => "http://localhost:5116",
            emailVerificationTtlMs: 24 * 60 * 60 * 1000,
            now: () => new Date("2026-03-08T10:00:00.000Z"),
        },
        "verify-token"
    );

    assert.deepEqual(result, {
        success: false,
        status: 400,
        message: "Token verifikasi tidak valid atau kadaluarsa",
    });
});

test("resendVerificationEmail sends email and returns debug URL", async () => {
    const sentEmails: Array<{ to: string; subject: string; html?: string }> = [];
    const auditLogs: Array<{ action: string; userId?: string }> = [];

    const result = await resendVerificationEmail(
        {
            prisma: {
                user: {
                    update: async () => null,
                },
                emailVerificationToken: {
                    findUnique: async () => null,
                    upsert: async () => null,
                    delete: async () => null,
                },
                $transaction: async () => [],
            },
            sendEmail: async (input) => {
                sentEmails.push(input);
            },
            logAudit: async (input) => {
                auditLogs.push(input);
            },
            generateSecureToken: () => "verify-token",
            getAppUrl: () => "http://localhost:5116",
            emailVerificationTtlMs: 24 * 60 * 60 * 1000,
            includeDebugUrl: true,
            now: () => new Date("2026-03-08T10:00:00.000Z"),
        },
        {
            id: "user_1",
            email: "user@example.com",
            username: "user.one",
            fullName: "User One",
            emailVerified: false,
        }
    );

    assert.equal(result.success, true);
    assert.equal(result.debugUrl, "http://localhost:5116/verify-email?token=verify-token");
    assert.equal(sentEmails[0]?.subject, "Verifikasi Email Duel Standby");
    assert.match(sentEmails[0]?.html || "", /Verifikasi Email/);
    assert.equal(auditLogs[0]?.action, "EMAIL_VERIFICATION_SENT");
});
