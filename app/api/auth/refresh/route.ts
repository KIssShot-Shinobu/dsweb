import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRefreshTokenFromCookie, rotateSession, setAuthCookie, setRefreshCookie, signToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { touchUserLastActiveAt } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const refreshToken = await getRefreshTokenFromCookie();
        if (!refreshToken) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const rotated = await rotateSession({
            refreshToken,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1",
            userAgent: req.headers.get("user-agent") || "unknown",
        });

        if (!rotated) {
            return NextResponse.json({ success: false, message: "Invalid or expired session" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: rotated.userId },
            select: { id: true, email: true, role: true, status: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const accessToken = await signToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
        });

        await setAuthCookie(accessToken);
        await setRefreshCookie(rotated.refreshToken);
        await touchUserLastActiveAt(user.id);

        await logAudit({
            action: "SESSION_REFRESHED",
            userId: user.id,
            targetId: rotated.id,
            targetType: "Session",
            details: { event: "REFRESH_TOKEN_ROTATION" },
        });

        return NextResponse.json({ success: true, message: "Token refreshed" });
    } catch (error) {
        console.error("[Refresh API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
