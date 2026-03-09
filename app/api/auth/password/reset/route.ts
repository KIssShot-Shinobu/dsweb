import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, invalidateUserSessions } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { resetPasswordWithToken } from "@/lib/services/auth-email-service";
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

        const result = await resetPasswordWithToken(
            {
                prisma: prisma as never,
                sendEmail: async () => undefined,
                logAudit,
                generateSecureToken: () => "",
                hashPassword,
                invalidateUserSessions,
                getAppUrl: () => "",
                passwordResetTokenTtlMs: 0,
            },
            {
                token: parsed.data.token,
                password: parsed.data.password,
            }
        );

        return NextResponse.json(
            { success: result.success, message: result.message },
            result.success ? undefined : { status: result.status || 400 }
        );
    } catch (error) {
        console.error("[Reset Password API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

