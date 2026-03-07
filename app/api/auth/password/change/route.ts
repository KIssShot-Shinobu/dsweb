import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearAuthCookies, comparePassword, getCurrentUser, hashPassword, revokeAllUserSessions } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { passwordChangeSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = passwordChangeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0].message, errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { id: true, password: true, email: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
        }

        const isCurrentPasswordValid = await comparePassword(parsed.data.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            await logAudit({
                action: "LOGIN_FAILED",
                userId: currentUser.id,
                targetType: "User",
                details: { reason: "Invalid current password on password change" },
            });

            return NextResponse.json({ success: false, message: "Password saat ini salah" }, { status: 400 });
        }

        const hashedPassword = await hashPassword(parsed.data.newPassword);

        await prisma.user.update({
            where: { id: currentUser.id },
            data: { password: hashedPassword },
        });

        await revokeAllUserSessions(currentUser.id);
        await clearAuthCookies();

        await logAudit({
            action: "PASSWORD_RESET_SUCCESS",
            userId: currentUser.id,
            targetType: "User",
            targetId: currentUser.id,
            details: { reason: "Password changed from settings" },
        });

        return NextResponse.json({
            success: true,
            message: "Password berhasil diubah. Silakan login ulang.",
        });
    } catch (error) {
        console.error("[Change Password API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
