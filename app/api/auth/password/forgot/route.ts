import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, PASSWORD_RESET_TOKEN_TTL_MS, hashPassword, invalidateUserSessions } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/runtime-config";
import { requestPasswordReset } from "@/lib/services/auth-email-service";
import { z } from "zod";

const forgotPasswordSchema = z.object({
    email: z.string().email("Email tidak valid"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = forgotPasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const result = await requestPasswordReset(
            {
                prisma: prisma as never,
                sendEmail,
                logAudit,
                generateSecureToken,
                hashPassword,
                invalidateUserSessions,
                getAppUrl,
                passwordResetTokenTtlMs: PASSWORD_RESET_TOKEN_TTL_MS,
                includeDebugUrl: process.env.NODE_ENV !== "production",
            },
            parsed.data.email
        );

        return NextResponse.json({
            success: result.success,
            message: result.message,
            ...(result.debugUrl ? { debugResetUrl: result.debugUrl } : {}),
        });
    } catch (error) {
        console.error("[Forgot Password API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
