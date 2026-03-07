import { NextResponse } from "next/server";
import { getCurrentUser, generateSecureToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { getAppUrl } from "@/lib/runtime-config";

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function POST() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        if (currentUser.emailVerified) {
            return NextResponse.json({ success: true, message: "Email sudah terverifikasi." });
        }

        const token = generateSecureToken(48);
        const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

        await prisma.emailVerificationToken.upsert({
            where: { userId: currentUser.id },
            update: { token, expiresAt },
            create: {
                userId: currentUser.id,
                token,
                expiresAt,
            },
        });

        const appUrl = getAppUrl();
        const verifyUrl = `${appUrl}/verify-email?token=${token}`;

        try {
            await sendEmail({
                to: currentUser.email,
                subject: "Verifikasi Email DuelStandby",
                text: `Halo ${currentUser.fullName},\n\nKlik link berikut untuk verifikasi email Anda:\n${verifyUrl}\n\nLink berlaku 24 jam.`,
                debugTag: "Auth][VerifyEmailResend",
            });
        } catch (emailError) {
            console.error("[Verify Email Resend API][Email]", emailError);
        }

        await logAudit({
            action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
            userId: currentUser.id,
            targetType: "EmailVerificationToken",
            details: { email: currentUser.email, expiresAt: expiresAt.toISOString() },
        });

        return NextResponse.json({
            success: true,
            message: "Link verifikasi sudah dikirim ulang.",
            ...(process.env.NODE_ENV !== "production" ? { debugVerifyUrl: verifyUrl } : {}),
        });
    } catch (error) {
        console.error("[Verify Email Resend API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
