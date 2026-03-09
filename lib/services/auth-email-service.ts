import { buildActionEmail } from "@/lib/email-templates";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditActionType } from "@/lib/audit-actions";
import type { AuditDetails } from "@/lib/audit-utils";

type SendEmailFn = (input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    debugTag?: string;
}) => Promise<void>;

type LogAuditFn = (input: {
    action: AuditActionType;
    userId?: string;
    targetId?: string;
    targetType?: string;
    details?: AuditDetails;
}) => Promise<void>;

type PasswordResetUser = {
    id: string;
    email: string;
    fullName: string;
};

type VerificationUser = {
    id: string;
    email: string;
    username?: string | null;
    fullName: string;
    emailVerified?: boolean;
};

type PasswordResetRecord = {
    id: string;
    userId: string;
    used: boolean;
    expiresAt: Date;
    user: PasswordResetUser;
};

type EmailVerificationRecord = {
    id: string;
    userId: string;
    expiresAt: Date;
    user: {
        id: string;
        email: string;
        status: string;
    };
};

type PasswordResetDeps = {
    prisma: {
        user: {
            findUnique(args: { where: { email: string } }): Promise<PasswordResetUser | null>;
            update(args: { where: { id: string }; data: { password: string } }): Promise<unknown>;
        };
        passwordResetToken: {
            upsert(args: {
                where: { userId: string };
                update: { token: string; expiresAt: Date; used: boolean };
                create: { userId: string; token: string; expiresAt: Date };
            }): Promise<unknown>;
            findUnique(args: {
                where: { token: string };
                include: { user: { select: { id: true; email: true; fullName: true } } };
            }): Promise<PasswordResetRecord | null>;
            update(args: { where: { id: string }; data: { used: boolean } }): Promise<unknown>;
            deleteMany(args: { where: { userId: string; id: { not: string } } }): Promise<unknown>;
        };
        $transaction(queries: unknown[]): Promise<unknown>;
    };
    sendEmail: SendEmailFn;
    logAudit: LogAuditFn;
    generateSecureToken(length: number): string;
    hashPassword(password: string): Promise<string>;
    revokeAllUserSessions(userId: string): Promise<void>;
    getAppUrl(): string;
    passwordResetTokenTtlMs: number;
    includeDebugUrl?: boolean;
    now?: () => Date;
};

type EmailVerificationDeps = {
    prisma: {
        user: {
            update(args: { where: { id: string }; data: { status: string } }): Promise<unknown>;
        };
        emailVerificationToken: {
            findUnique(args: {
                where: { token: string };
                include: { user: { select: { id: true; email: true; status: true } } };
            }): Promise<EmailVerificationRecord | null>;
            upsert(args: {
                where: { userId: string };
                update: { token: string; expiresAt: Date };
                create: { userId: string; token: string; expiresAt: Date };
            }): Promise<unknown>;
            delete(args: { where: { id: string } }): Promise<unknown>;
        };
        $transaction(queries: unknown[]): Promise<unknown>;
    };
    sendEmail: SendEmailFn;
    logAudit: LogAuditFn;
    generateSecureToken(length: number): string;
    getAppUrl(): string;
    emailVerificationTtlMs: number;
    includeDebugUrl?: boolean;
    now?: () => Date;
};

type ServiceResult = {
    success: boolean;
    message: string;
    status?: number;
    debugUrl?: string;
};

function getCurrentTime(now?: () => Date) {
    return now ? now() : new Date();
}

export async function requestPasswordReset(
    deps: PasswordResetDeps,
    email: string
): Promise<ServiceResult> {
    const user = await deps.prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        await deps.logAudit({
            action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
            details: { email, userFound: false },
        });

        return {
            success: true,
            message: "Jika email terdaftar, link reset sudah dikirim.",
        };
    }

    const token = deps.generateSecureToken(48);
    const expiresAt = new Date(getCurrentTime(deps.now).getTime() + deps.passwordResetTokenTtlMs);

    await deps.prisma.passwordResetToken.upsert({
        where: { userId: user.id },
        update: {
            token,
            expiresAt,
            used: false,
        },
        create: {
            userId: user.id,
            token,
            expiresAt,
        },
    });

    const resetUrl = `${deps.getAppUrl()}/reset-password?token=${token}`;
    const emailContent = buildActionEmail({
        recipientName: user.fullName,
        preheader: "Password Reset",
        title: "Atur ulang password akun Anda",
        body: "Kami menerima permintaan reset password untuk akun Anda. Jika ini memang Anda, gunakan link berikut untuk membuat password baru.",
        actionLabel: "Reset Password",
        actionUrl: resetUrl,
        expiryLabel: "Link reset berlaku selama 15 menit dan hanya bisa digunakan sekali.",
    });

    try {
        await deps.sendEmail({
            to: user.email,
            subject: "Reset Password Duel Standby",
            text: emailContent.text,
            html: emailContent.html,
            debugTag: "Auth][PasswordReset",
        });
    } catch {
        // Keep account enumeration behavior unchanged.
    }

    await deps.logAudit({
        action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
        userId: user.id,
        targetType: "PasswordResetToken",
        details: { email: user.email, expiresAt: expiresAt.toISOString() },
    });

    return {
        success: true,
        message: "Jika email terdaftar, link reset sudah dikirim.",
        ...(deps.includeDebugUrl ? { debugUrl: resetUrl } : {}),
    };
}

export async function resetPasswordWithToken(
    deps: PasswordResetDeps,
    input: { token: string; password: string }
): Promise<ServiceResult> {
    const now = getCurrentTime(deps.now);
    const resetToken = await deps.prisma.passwordResetToken.findUnique({
        where: { token: input.token },
        include: {
            user: {
                select: { id: true, email: true, fullName: true },
            },
        },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < now.getTime()) {
        return {
            success: false,
            status: 400,
            message: "Token reset tidak valid atau kadaluarsa",
        };
    }

    const hashedPassword = await deps.hashPassword(input.password);

    await deps.prisma.$transaction([
        deps.prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedPassword },
        }),
        deps.prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { used: true },
        }),
        deps.prisma.passwordResetToken.deleteMany({
            where: { userId: resetToken.userId, id: { not: resetToken.id } },
        }),
    ]);

    await deps.revokeAllUserSessions(resetToken.userId);

    await deps.logAudit({
        action: AUDIT_ACTIONS.PASSWORD_RESET_SUCCESS,
        userId: resetToken.userId,
        targetType: "PasswordResetToken",
        targetId: resetToken.id,
        details: { email: resetToken.user.email },
    });

    return {
        success: true,
        message: "Password berhasil direset. Silakan login ulang.",
    };
}

export async function verifyEmailToken(
    deps: EmailVerificationDeps,
    token: string
): Promise<ServiceResult> {
    const record = await deps.prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: { select: { id: true, email: true, status: true } } },
    });

    if (!record || record.expiresAt.getTime() < getCurrentTime(deps.now).getTime()) {
        return {
            success: false,
            status: 400,
            message: "Token verifikasi tidak valid atau kadaluarsa",
        };
    }

    await deps.prisma.$transaction([
        deps.prisma.user.update({
            where: { id: record.userId },
            data: { status: "ACTIVE" },
        }),
        deps.prisma.emailVerificationToken.delete({
            where: { id: record.id },
        }),
    ]);

    await deps.logAudit({
        action: AUDIT_ACTIONS.EMAIL_VERIFIED,
        userId: record.userId,
        targetId: record.id,
        targetType: "EmailVerificationToken",
        details: { email: record.user.email },
    });

    return {
        success: true,
        message: "Email berhasil diverifikasi.",
    };
}

export async function resendVerificationEmail(
    deps: EmailVerificationDeps,
    currentUser: VerificationUser
): Promise<ServiceResult> {
    if (currentUser.emailVerified) {
        return {
            success: true,
            message: "Email sudah terverifikasi.",
        };
    }

    const token = deps.generateSecureToken(48);
    const expiresAt = new Date(getCurrentTime(deps.now).getTime() + deps.emailVerificationTtlMs);

    await deps.prisma.emailVerificationToken.upsert({
        where: { userId: currentUser.id },
        update: { token, expiresAt },
        create: {
            userId: currentUser.id,
            token,
            expiresAt,
        },
    });

    const verifyUrl = `${deps.getAppUrl()}/verify-email?token=${token}`;
    const emailContent = buildActionEmail({
        recipientName: currentUser.username || currentUser.fullName,
        preheader: "Email Verification",
        title: "Link verifikasi baru sudah siap",
        body: "Gunakan link berikut untuk menyelesaikan verifikasi email akun Anda. Setelah berhasil, email akun Anda akan tercatat sebagai aktif.",
        actionLabel: "Verifikasi Email",
        actionUrl: verifyUrl,
        expiryLabel: "Link verifikasi berlaku selama 24 jam.",
    });

    try {
        await deps.sendEmail({
            to: currentUser.email,
            subject: "Verifikasi Email Duel Standby",
            text: emailContent.text,
            html: emailContent.html,
            debugTag: "Auth][VerifyEmailResend",
        });
    } catch {
        // Keep response stable if provider fails.
    }

    await deps.logAudit({
        action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
        userId: currentUser.id,
        targetType: "EmailVerificationToken",
        details: { email: currentUser.email, expiresAt: expiresAt.toISOString() },
    });

    return {
        success: true,
        message: "Link verifikasi sudah dikirim ulang.",
        ...(deps.includeDebugUrl ? { debugUrl: verifyUrl } : {}),
    };
}
