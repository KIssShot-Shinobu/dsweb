import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { generateSecureToken, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { sendEmail } from "@/lib/email";
import { registerUser } from "@/lib/services/auth-service";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const result = await registerUser(
            {
                prisma: prisma as any,
                hashPassword,
                comparePassword: async () => false,
                generateSecureToken,
            },
            parsed.data
        );

        if (!result.ok) {
            if (result.code === "EMAIL_EXISTS") {
                return NextResponse.json(
                    { success: false, message: "Email sudah terdaftar", errors: { email: ["Email sudah digunakan"] } },
                    { status: 409 }
                );
            }

            if (result.code === "PHONE_EXISTS") {
                return NextResponse.json(
                    { success: false, message: "Nomor WhatsApp sudah terdaftar", errors: { phoneWhatsapp: ["Nomor sudah digunakan"] } },
                    { status: 409 }
                );
            }

            if (result.code === "GAME_ID_EXISTS") {
                return NextResponse.json(
                    { success: false, message: "ID Game sudah terdaftar", errors: { duelLinksGameId: ["ID Game sudah digunakan"] } },
                    { status: 409 }
                );
            }

            return NextResponse.json({ success: false, message: "Registrasi gagal" }, { status: 400 });
        }

        const { user, verifyToken } = result;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;

        try {
            await sendEmail({
                to: user.email,
                subject: "Verifikasi Email DuelStandby",
                text: `Halo ${user.fullName},\n\nVerifikasi email akun Anda di link berikut:\n${verifyUrl}\n\nJika Anda tidak merasa mendaftar, abaikan email ini.`,
                debugTag: "Auth][VerifyEmail",
            });
        } catch (emailError) {
            console.error("[Register API][Email]", emailError);
        }

        await logAudit({ action: "USER_REGISTERED", userId: user.id });

        return NextResponse.json(
            {
                success: true,
                message: "Registrasi berhasil! Akun Anda sudah aktif dan bisa langsung login.",
                userId: user.id,
                ...(process.env.NODE_ENV !== "production" ? { debugVerifyUrl: verifyUrl } : {}),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[Register API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
