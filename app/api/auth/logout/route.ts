import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getRefreshTokenFromCookie, getTokenFromCookie, revokeSession, verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
    const token = await getTokenFromCookie();
    const refreshToken = await getRefreshTokenFromCookie();
    let userId = "0";
    if (token) {
        const payload = await verifyToken(token);
        if (payload) userId = payload.userId;
    }

    if (refreshToken) {
        await revokeSession(refreshToken);
    }

    await logAudit({ action: "LOGOUT", userId });
    await clearAuthCookies();
    return NextResponse.json({ success: true, message: "Logged out" });
}
