import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, getTokenFromCookie, verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
    const token = await getTokenFromCookie();
    let userId = "0";
    if (token) {
        const payload = await verifyToken(token);
        if (payload) userId = payload.userId;
    }

    await logAudit({ action: "LOGOUT", userId });
    await clearAuthCookie();
    return NextResponse.json({ success: true, message: "Logged out" });
}
