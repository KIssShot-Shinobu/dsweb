import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, revokeAllUserSessions } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { z } from "zod";

const resetPasswordSchema = z
    .object({
        token: z.string().min(20, "Token tidak valid"),
        password: z
            .string()
            .min(8, "Password minimal 8 karakter")
            .regex(/[A-Za-z]/, "Password harus mengandung huruf")
            .regex(/[0-9]/, "Password harus mengandung angka"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Konfirmasi password tidak cocok",
        path: ["confirmPassword"],
    });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = resetPasswordSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const { token, password } = parsed.data;
        const now = new Date();

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: {
                user: {
                    select: { id: true, email: true, fullName: true },
                },
            },
        });

        if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < now.getTime()) {
            return NextResponse.json({ success: false, message: "Token reset tidak valid atau kadaluarsa" }, { status: 400 });
        }

        const hashed = await hashPassword(password);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashed },
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
            prisma.passwordResetToken.deleteMany({
                where: { userId: resetToken.userId, id: { not: resetToken.id } },
            }),
        ]);

        await revokeAllUserSessions(resetToken.userId);

        await logAudit({
            action: "PASSWORD_RESET_SUCCESS",
            userId: resetToken.userId,
            targetType: "PasswordResetToken",
            targetId: resetToken.id,
            details: { email: resetToken.user.email },
        });

        return NextResponse.json({ success: true, message: "Password berhasil direset. Silakan login ulang." });
    } catch (error) {
        console.error("[Reset Password API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

