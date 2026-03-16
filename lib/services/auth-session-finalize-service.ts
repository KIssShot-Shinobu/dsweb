import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { NotificationService } from "@/lib/services/notification.service";

type FinalizeUserRecord = {
    id: string;
    email: string;
    username: string;
    fullName: string;
    role: string;
    status: string;
    emailVerificationToken?: { id: string } | null;
};

type FinalizeDeps = {
    prisma: {
        user: {
            findUnique: (args: { where: { email: string }; select: Record<string, unknown> }) => Promise<FinalizeUserRecord | null>;
            update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
        };
    };
    notifications?: NotificationService;
    touchUserLastActiveAt: (userId: string) => Promise<void>;
    logAudit: (params: {
        action: string;
        userId?: string;
        targetId?: string;
        targetType?: string;
        details?: Record<string, unknown>;
    }) => Promise<void>;
    now?: () => Date;
};

type FinalizeInput = {
    email: string;
    provider: "google" | "credentials" | "discord";
    redirectTarget: string;
    ipAddress?: string | null;
    userAgent?: string | null;
};

export async function finalizeAuthenticatedSession(deps: FinalizeDeps, input: FinalizeInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await deps.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            email: true,
            username: true,
            fullName: true,
            role: true,
            status: true,
            emailVerificationToken: {
                select: { id: true },
            },
        },
    });

    if (!user) {
        return { ok: false as const, code: "USER_NOT_FOUND" };
    }

    if (user.status === "BANNED") {
        await deps.logAudit({
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            userId: user.id,
            targetId: user.id,
            targetType: "User",
            details: { provider: input.provider, reason: "User is banned" },
        });

        return { ok: false as const, code: "BANNED", user };
    }

    await deps.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: deps.now?.() ?? new Date() },
    });
    await deps.touchUserLastActiveAt(user.id);

    const emailVerified = !user.emailVerificationToken;
    if (!emailVerified && deps.notifications) {
        await deps.notifications.createNotification({
            userId: user.id,
            type: "SYSTEM_ALERT",
            title: "Verifikasi email kamu",
            message: "Akun kamu belum diverifikasi. Verifikasi email untuk mengamankan akun dan akses penuh.",
            link: "/dashboard/settings",
        });
    }

    if (input.provider === "google") {
        await deps.logAudit({
            action: AUDIT_ACTIONS.OAUTH_GOOGLE_LOGIN_SUCCESS,
            userId: user.id,
            targetId: user.id,
            targetType: "User",
            details: { provider: input.provider, redirectTarget: input.redirectTarget },
        });
    }

    if (input.provider === "discord") {
        await deps.logAudit({
            action: AUDIT_ACTIONS.OAUTH_DISCORD_LOGIN_SUCCESS,
            userId: user.id,
            targetId: user.id,
            targetType: "User",
            details: { provider: input.provider, redirectTarget: input.redirectTarget },
        });
    }

    await deps.logAudit({
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        userId: user.id,
        targetId: user.id,
        targetType: "User",
        details: { provider: input.provider },
    });

    return { ok: true as const, user, emailVerified };
}
