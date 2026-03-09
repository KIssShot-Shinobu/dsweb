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
import { extractRequestIp } from "@/lib/request-ip";
import { assertClaimableRegisterUploads, claimRegisterUploads } from "@/lib/upload-security";
import { resolveIndonesiaRegionSelection } from "@/lib/indonesia-regions";
import type { RegisterInput } from "@/lib/validators";

function buildRegisterConflictResponse(code: string) {
    if (code === "USERNAME_EXISTS") {
        return NextResponse.json(
            { success: false, message: "Username sudah terdaftar", errors: { username: ["Username sudah digunakan"] } },
            { status: 409 },
        );
    }

    if (code === "EMAIL_EXISTS") {
        return NextResponse.json(
            { success: false, message: "Email sudah terdaftar", errors: { email: ["Email sudah digunakan"] } },
            { status: 409 },
        );
    }

    if (code === "PHONE_EXISTS") {
        return NextResponse.json(
            { success: false, message: "Nomor WhatsApp sudah terdaftar", errors: { phoneWhatsapp: ["Nomor sudah digunakan"] } },
            { status: 409 },
        );
    }

    if (code === "GAME_ID_EXISTS") {
        return NextResponse.json(
            {
                success: false,
                message: "ID Game sudah terdaftar",
                errors: {
                    duelLinksGameId: ["ID Game sudah digunakan"],
                    masterDuelGameId: ["Periksa kembali Game ID yang Anda masukkan"],
                },
            },
            { status: 409 },
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

function queueRegisterEmail(username: string, email: string, verifyUrl: string) {
    const emailContent = buildActionEmail({
        recipientName: username,
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

function buildPrismaConflictResponse(error: Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2002") {
        return null;
    }

    const targets = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [];

    if (targets.includes("email")) {
        return buildRegisterConflictResponse("EMAIL_EXISTS");
    }

    if (targets.includes("username")) {
        return buildRegisterConflictResponse("USERNAME_EXISTS");
    }

    if (targets.includes("phoneWhatsappHash") || targets.includes("phoneWhatsapp")) {
        return buildRegisterConflictResponse("PHONE_EXISTS");
    }

    if (targets.includes("gameId")) {
        return buildRegisterConflictResponse("GAME_ID_EXISTS");
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

        const resolvedRegion = await resolveIndonesiaRegionSelection(parsed.data.provinceCode, parsed.data.cityCode);
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
            { ...parsed.data, ...resolvedRegion },
            { skipConflictCheck: true },
        );

        if (!result.ok) return buildRegisterConflictResponse(result.code);

        const { user, verifyToken } = result;
        await claimUploadsOrRollback(user.id, ipAddress, parsed.data);

        const appUrl = getAppUrl();
        const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;

        queueRegisterEmail(user.username, user.email, verifyUrl);
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
