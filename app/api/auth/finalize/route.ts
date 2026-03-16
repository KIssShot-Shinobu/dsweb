import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit-logger";
import { prisma, touchUserLastActiveAt } from "@/lib/prisma";
import { finalizeAuthenticatedSession } from "@/lib/services/auth-session-finalize-service";
import { createNotificationService } from "@/lib/services/notification.service";

const DEFAULT_REDIRECT = "/dashboard";

function resolveRedirect(input: unknown) {
    if (typeof input !== "string") {
        return { redirectTarget: DEFAULT_REDIRECT, isDefault: true };
    }

    const trimmed = input.trim();
    if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return { redirectTarget: DEFAULT_REDIRECT, isDefault: true };
    }

    return { redirectTarget: trimmed, isDefault: trimmed === DEFAULT_REDIRECT };
}

function getDefaultRedirect(role: string, emailVerified: boolean) {
    if (!emailVerified) {
        return "/dashboard/settings";
    }

    if (role === "ADMIN" || role === "FOUNDER") {
        return "/dashboard";
    }

    return "/dashboard/profile";
}

function getProvider(input: string | null): "google" | "credentials" | "discord" {
    if (input === "credentials") return "credentials";
    if (input === "discord") return "discord";
    return "google";
}

async function runFinalize(request: NextRequest, redirectTarget: string, provider: "google" | "credentials" | "discord") {
    const session = await auth();

    if (!session?.user?.email) {
        return { ok: false as const, code: "NO_SESSION" };
    }

    const notifications = createNotificationService({ prisma });

    return finalizeAuthenticatedSession(
        {
            prisma: {
                user: {
                    findUnique: (args) => prisma.user.findUnique(args as never) as Promise<any>,
                    update: (args) => prisma.user.update(args as never),
                },
            },
            notifications,
            touchUserLastActiveAt,
            logAudit: (params) => logAudit(params as any),
        },
        {
            email: session.user.email,
            provider,
            redirectTarget,
            ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
            userAgent: request.headers.get("user-agent") || "unknown",
        }
    );
}

export async function GET(request: NextRequest) {
    const { redirectTarget } = resolveRedirect(request.nextUrl.searchParams.get("redirect"));
    const provider = getProvider(request.nextUrl.searchParams.get("provider"));
    const targetUrl = new URL("/oauth-finalize", request.url);
    targetUrl.searchParams.set("provider", provider);
    targetUrl.searchParams.set("redirect", redirectTarget);
    return NextResponse.redirect(targetUrl);
}

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const { redirectTarget, isDefault } = resolveRedirect(body?.redirect);
    const provider = getProvider(typeof body?.provider === "string" ? body.provider : null);
    const result = await runFinalize(request, redirectTarget, provider);

    if (!result.ok) {
        if (result.code === "BANNED") {
            return NextResponse.json(
                { success: false, message: "Akun Anda diblokir. Silakan hubungi admin.", code: "banned" },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { success: false, message: "Sesi login tidak valid. Coba masuk lagi.", code: "session_invalid" },
            { status: 401 }
        );
    }

    const resolvedRedirect = isDefault
        ? getDefaultRedirect(result.user.role, result.emailVerified)
        : redirectTarget;

    return NextResponse.json({
        success: true,
        redirectTo: resolvedRedirect,
        user: {
            id: result.user.id,
            username: result.user.username,
            fullName: result.user.fullName,
            email: result.user.email,
            role: result.user.role,
            status: result.user.status,
        },
    });
}
