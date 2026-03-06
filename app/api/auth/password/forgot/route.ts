import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { sendEmail } from "@/lib/email";
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

        const { email } = parsed.data;
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, fullName: true },
        });

        // Always return generic success response to prevent account enumeration.
        if (!user) {
            await logAudit({ action: "PASSWORD_RESET_REQUEST", details: { email, userFound: false } });
            return NextResponse.json({ success: true, message: "Jika email terdaftar, link reset sudah dikirim." });
        }

        const token = generateSecureToken(48);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

        await prisma.passwordResetToken.upsert({
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

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const resetUrl = `${appUrl}/reset-password?token=${token}`;
        try {
            await sendEmail({
                to: user.email,
                subject: "Reset Password DuelStandby",
                text: `Halo ${user.fullName},\n\nGunakan link berikut untuk reset password (berlaku 15 menit):\n${resetUrl}\n\nJika Anda tidak meminta reset password, abaikan email ini.`,
                debugTag: "Auth][PasswordReset",
            });
        } catch (emailError) {
            // Keep generic success response to avoid account enumeration and avoid hard-failing flow.
            console.error("[Forgot Password API][Email]", emailError);
        }

        await logAudit({
            action: "PASSWORD_RESET_REQUEST",
            userId: user.id,
            targetType: "PasswordResetToken",
            details: { email: user.email, expiresAt: expiresAt.toISOString() },
        });

        return NextResponse.json({
            success: true,
            message: "Jika email terdaftar, link reset sudah dikirim.",
            ...(process.env.NODE_ENV !== "production" ? { debugResetUrl: resetUrl } : {}),
        });
    } catch (error) {
        console.error("[Forgot Password API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
