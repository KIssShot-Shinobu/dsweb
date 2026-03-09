import { NextResponse } from "next/server";
import { getCurrentUser, generateSecureToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit-logger";
import { getAppUrl } from "@/lib/runtime-config";
import { resendVerificationEmail } from "@/lib/services/auth-email-service";

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function POST() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const result = await resendVerificationEmail(
            {
                prisma: prisma as never,
                sendEmail,
                logAudit,
                generateSecureToken,
                getAppUrl,
                emailVerificationTtlMs: EMAIL_VERIFICATION_TTL_MS,
                includeDebugUrl: process.env.NODE_ENV !== "production",
            },
            currentUser
        );

        return NextResponse.json({
            success: result.success,
            message: result.message,
            ...(result.debugUrl ? { debugVerifyUrl: result.debugUrl } : {}),
        });
    } catch (error) {
        console.error("[Verify Email Resend API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
