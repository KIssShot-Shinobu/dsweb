import { AUDIT_ACTIONS } from "@/lib/audit-actions";

type FinalizeUserRecord = {
    id: string;
    email: string;
    username: string;
    fullName: string;
    role: string;
    status: string;
};

type FinalizeDeps = {
    prisma: {
        user: {
            findUnique: (args: { where: { email: string }; select: Record<string, boolean> }) => Promise<FinalizeUserRecord | null>;
            update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
        };
    };
    signToken: (payload: { userId: string; email: string; role: string; status: string }) => Promise<string>;
    setAuthCookie: (token: string) => Promise<void>;
    clearRefreshCookie: () => Promise<void>;
    createSession: (params: { userId: string; ipAddress?: string | null; userAgent?: string | null }) => Promise<{ refreshToken: string }>;
    setRefreshCookie: (token: string) => Promise<void>;
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
    provider: "google" | "credentials";
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

    const accessToken = await deps.signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
    });

    await deps.setAuthCookie(accessToken);

    try {
        const refreshSession = await deps.createSession({
            userId: user.id,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
        });
        await deps.setRefreshCookie(refreshSession.refreshToken);
    } catch {
        await deps.clearRefreshCookie();
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

    await deps.logAudit({
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        userId: user.id,
        targetId: user.id,
        targetType: "User",
        details: { provider: input.provider },
    });

    return { ok: true as const, user };
}
