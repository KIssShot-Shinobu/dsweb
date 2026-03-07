import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { clearRefreshCookie, comparePassword, createSession, setAuthCookie, setRefreshCookie, signToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { authenticateUser } from "@/lib/services/auth-service";
import { touchUserLastActiveAt } from "@/lib/prisma";

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

        const authResult = await authenticateUser(
            { prisma: prisma as any, comparePassword },
            { email: parsed.data.email, password: parsed.data.password }
        );

        if (!authResult.ok) {
            if (authResult.code === "INVALID_CREDENTIALS") {
                await logAudit({
                    action: "LOGIN_FAILED",
                    userId: authResult.userId,
                    details: { email: parsed.data.email, reason: "Invalid credentials" },
                });
                return NextResponse.json(
                    { success: false, message: "Email atau password salah" },
                    { status: 401 }
                );
            }

            const blockedMessages: Record<string, { message: string; status: number }> = {
                PENDING: {
                    message: "Akun Anda masih menunggu persetujuan admin. Harap bersabar.",
                    status: 403,
                },
                REJECTED: {
                    message: "Pendaftaran Anda telah ditolak. Silakan hubungi admin.",
                    status: 403,
                },
                BANNED: {
                    message: "Akun Anda telah diblokir. Silakan hubungi admin.",
                    status: 403,
                },
            };

            const blocked = blockedMessages[authResult.code] || { message: "Akses ditolak", status: 403 };
            return NextResponse.json(
                { success: false, message: blocked.message, code: authResult.code },
                { status: blocked.status }
            );
        }

        const user = authResult.user;

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        await touchUserLastActiveAt(user.id);

        // Issue short-lived access token + refresh session token
        const accessToken = await signToken({ userId: user.id, email: user.email, role: user.role, status: user.status });
        await setAuthCookie(accessToken);
        try {
            const session = await createSession({
                userId: user.id,
                ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1",
                userAgent: req.headers.get("user-agent") || "unknown",
            });
            await setRefreshCookie(session.refreshToken);
        } catch (sessionError) {
            // Graceful fallback while DB migration is being applied.
            console.error("[Login API][Session]", sessionError);
            await clearRefreshCookie();
        }

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
