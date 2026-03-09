import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit-logger";
import { prisma, touchUserLastActiveAt } from "@/lib/prisma";
import { finalizeAuthenticatedSession } from "@/lib/services/auth-session-finalize-service";

function getSafeRedirect(input: string | null) {
    if (!input) {
        return "/dashboard";
    }

    if (!input.startsWith("/") || input.startsWith("//")) {
        return "/dashboard";
    }

    return input;
}

function getProvider(input: string | null): "google" | "credentials" {
    return input === "credentials" ? "credentials" : "google";
}

async function runFinalize(request: NextRequest, redirectTarget: string, provider: "google" | "credentials") {
    const session = await auth();

    if (!session?.user?.email) {
        return { ok: false as const, code: "NO_SESSION" };
    }

    return finalizeAuthenticatedSession(
        {
            prisma: {
                user: {
                    findUnique: (args) => prisma.user.findUnique(args as never) as Promise<any>,
                    update: (args) => prisma.user.update(args as never),
                },
            },
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
    const redirectTarget = getSafeRedirect(request.nextUrl.searchParams.get("redirect"));
    const provider = getProvider(request.nextUrl.searchParams.get("provider"));
    const targetUrl = new URL("/oauth-finalize", request.url);
    targetUrl.searchParams.set("provider", provider);
    targetUrl.searchParams.set("redirect", redirectTarget);
    return NextResponse.redirect(targetUrl);
}

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const redirectTarget = getSafeRedirect(typeof body?.redirect === "string" ? body.redirect : null);
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

    return NextResponse.json({
        success: true,
        redirectTo: redirectTarget,
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
