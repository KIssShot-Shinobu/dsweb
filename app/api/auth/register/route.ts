import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { generateSecureToken, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { sendEmail } from "@/lib/email";
import { buildActionEmail } from "@/lib/email-templates";
import { findRegisterConflict, registerUser } from "@/lib/services/auth-service";
import { getAppUrl } from "@/lib/runtime-config";

function buildRegisterConflictResponse(code: string) {
    if (code === "EMAIL_EXISTS") {
        return NextResponse.json(
            { success: false, message: "Email sudah terdaftar", errors: { email: ["Email sudah digunakan"] } },
            { status: 409 },
        );
    }

    return NextResponse.json({ success: false, message: "Registrasi gagal" }, { status: 400 });
}

function queueRegisterEmail(fullName: string, email: string, verifyUrl: string) {
    const emailContent = buildActionEmail({
        recipientName: fullName,
        preheader: "Email Verification",
        title: "Verifikasi email akun Anda",
        body: "Terima kasih sudah bergabung. Konfirmasi email Anda untuk mengamankan akun dan memastikan notifikasi penting bisa kami kirim dengan benar.",
        actionLabel: "Verifikasi Email",
        actionUrl: verifyUrl,
        expiryLabel: "Link verifikasi berlaku selama 24 jam.",
    });

    void sendEmail({
        to: email,
        subject: "Verifikasi Email Duel Standby",
        text: emailContent.text,
        html: emailContent.html,
        debugTag: "Auth][VerifyEmail",
    }).catch((emailError) => {
        console.error("[Register API][Email]", emailError);
    });
}

function buildPrismaConflictResponse(error: Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2002") {
        return null;
    }

    const targets = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [];

    if (targets.includes("email")) {
        return buildRegisterConflictResponse("EMAIL_EXISTS");
    }

    return NextResponse.json({ success: false, message: "Data registrasi bentrok dengan data yang sudah ada" }, { status: 409 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
                { status: 400 },
            );
        }

        const conflictCode = await findRegisterConflict({ prisma: prisma as any }, parsed.data);
        if (conflictCode) {
            return buildRegisterConflictResponse(conflictCode);
        }

        const result = await registerUser(
            {
                prisma: prisma as any,
                hashPassword,
                comparePassword: async () => false,
                generateSecureToken,
            },
            parsed.data,
            { skipConflictCheck: true },
        );

        if (!result.ok) return buildRegisterConflictResponse(result.code);

        const { user, verifyToken } = result;

        const appUrl = getAppUrl();
        const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;

        queueRegisterEmail(user.fullName, user.email, verifyUrl);
        await logAudit({ action: "USER_REGISTERED", userId: user.id });

        return NextResponse.json(
            {
                success: true,
                message: "Registrasi berhasil! Akun publik Anda sudah aktif dan bisa langsung login.",
                userId: user.id,
                ...(process.env.NODE_ENV !== "production" ? { debugVerifyUrl: verifyUrl } : {}),
            },
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            const conflictResponse = buildPrismaConflictResponse(error);
            if (conflictResponse) {
                return conflictResponse;
            }
        }

        if (error instanceof Error) {
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }

        console.error("[Register API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
