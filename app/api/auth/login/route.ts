import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email, password } = parsed.data;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, fullName: true, password: true, status: true, role: true },
        });

        if (!user) {
            await logAudit({ action: "LOGIN_FAILED", details: { email, reason: "User not found" } });
            return NextResponse.json(
                { success: false, message: "Email atau password salah" },
                { status: 401 }
            );
        }

        // Check password
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            await logAudit({ action: "LOGIN_FAILED", userId: user.id, details: { reason: "Wrong password" } });
            return NextResponse.json(
                { success: false, message: "Email atau password salah" },
                { status: 401 }
            );
        }

        // Check account status (only block non-admins)
        const isAdmin = ["ADMIN", "FOUNDER"].includes(user.role);
        if (!isAdmin) {
            if (user.status === "PENDING") {
                return NextResponse.json(
                    { success: false, message: "Akun Anda masih menunggu persetujuan admin. Harap bersabar.", code: "PENDING" },
                    { status: 403 }
                );
            }
            if (user.status === "REJECTED") {
                return NextResponse.json(
                    { success: false, message: "Pendaftaran Anda telah ditolak. Silakan hubungi admin.", code: "REJECTED" },
                    { status: 403 }
                );
            }
            if (user.status === "BANNED") {
                return NextResponse.json(
                    { success: false, message: "Akun Anda telah diblokir. Silakan hubungi admin.", code: "BANNED" },
                    { status: 403 }
                );
            }
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Sign JWT + set cookie
        const token = await signToken({ userId: user.id, email: user.email, role: user.role, status: user.status });
        await setAuthCookie(token);

        await logAudit({ action: "LOGIN_SUCCESS", userId: user.id });

        return NextResponse.json({
            success: true,
            message: "Login berhasil",
            user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status },
        });
    } catch (error) {
        console.error("[Login API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
