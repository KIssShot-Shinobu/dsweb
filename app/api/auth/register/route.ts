import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { generateSecureToken, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { sendEmail } from "@/lib/email";
import { registerUser } from "@/lib/services/auth-service";
import { getAppUrl } from "@/lib/runtime-config";
import { extractRequestIp } from "@/lib/request-ip";
import { assertClaimableRegisterUploads, claimRegisterUploads } from "@/lib/upload-security";
import type { RegisterInput } from "@/lib/validators";

function buildRegisterConflictResponse(code: string) {
    if (code === "EMAIL_EXISTS") {
        return NextResponse.json(
            { success: false, message: "Email sudah terdaftar", errors: { email: ["Email sudah digunakan"] } },
            { status: 409 }
        );
    }

    if (code === "PHONE_EXISTS") {
        return NextResponse.json(
            { success: false, message: "Nomor WhatsApp sudah terdaftar", errors: { phoneWhatsapp: ["Nomor sudah digunakan"] } },
            { status: 409 }
        );
    }

    if (code === "GAME_ID_EXISTS") {
        return NextResponse.json(
            { success: false, message: "ID Game sudah terdaftar", errors: { duelLinksGameId: ["ID Game sudah digunakan"] } },
            { status: 409 }
        );
    }

    return NextResponse.json({ success: false, message: "Registrasi gagal" }, { status: 400 });
}

function getRegisterUploadMap(data: RegisterInput) {
    return {
        DUEL_LINKS: data.duelLinksScreenshotUploadId || undefined,
        MASTER_DUEL: data.masterDuelScreenshotUploadId || undefined,
    } as const;
}

async function claimUploadsOrRollback(userId: string, ipAddress: string, data: RegisterInput) {
    try {
        await claimRegisterUploads({
            prisma,
            userId,
            ipAddress,
            uploads: getRegisterUploadMap(data),
        });
    } catch (error) {
        await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
        throw error;
    }
}

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

        const ipAddress = extractRequestIp(req.headers);
        const uploadIds = Object.values(getRegisterUploadMap(parsed.data)).filter((value): value is string => Boolean(value));

        await assertClaimableRegisterUploads({
            prisma,
            ipAddress,
            uploadIds,
        });

        const result = await registerUser(
            {
                prisma: prisma as any,
                hashPassword,
                comparePassword: async () => false,
                generateSecureToken,
            },
            parsed.data
        );

        if (!result.ok) return buildRegisterConflictResponse(result.code);

        const { user, verifyToken } = result;
        await claimUploadsOrRollback(user.id, ipAddress, parsed.data);

        const appUrl = getAppUrl();
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
        if (error instanceof Error) {
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }

        console.error("[Register API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
