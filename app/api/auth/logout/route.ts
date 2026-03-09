import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit-logger";
import { getServerCurrentUser } from "@/lib/server-current-user";

export async function POST(req: NextRequest) {
    const currentUser = await getServerCurrentUser();
    const userId = currentUser?.id || "0";

    await logAudit({ action: "LOGOUT", userId });

    const response = NextResponse.json({ success: true, message: "Logged out" });
    response.cookies.delete("ds_auth");
    response.cookies.delete("ds_refresh");
    return response;
}
