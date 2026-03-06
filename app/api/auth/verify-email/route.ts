import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { z } from "zod";

const verifyEmailSchema = z.object({
    token: z.string().min(20, "Token tidak valid"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = verifyEmailSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const { token } = parsed.data;
        const record = await prisma.emailVerificationToken.findUnique({
            where: { token },
            include: { user: { select: { id: true, email: true, status: true } } },
        });

        if (!record || record.expiresAt.getTime() < Date.now()) {
            return NextResponse.json({ success: false, message: "Token verifikasi tidak valid atau kadaluarsa" }, { status: 400 });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: record.userId },
                data: { status: "ACTIVE" },
            }),
            prisma.emailVerificationToken.delete({
                where: { id: record.id },
            }),
        ]);

        await logAudit({
            action: "EMAIL_VERIFIED",
            userId: record.userId,
            targetId: record.id,
            targetType: "EmailVerificationToken",
            details: { email: record.user.email },
        });

        return NextResponse.json({ success: true, message: "Email berhasil diverifikasi." });
    } catch (error) {
        console.error("[Verify Email API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

