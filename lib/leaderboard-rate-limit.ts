import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractIP } from "@/lib/audit-logger";
import { getRateLimitEnabled, getRateLimitLeaderboard } from "@/lib/runtime-config";

export function enforceLeaderboardRateLimit(request: Request, scope: string) {
    if (!getRateLimitEnabled()) return null;
    const ipAddress = extractIP(request.headers);
    const { max, windowSeconds } = getRateLimitLeaderboard();
    const rate = checkRateLimit(`leaderboard:${scope}:${ipAddress}`, {
        windowMs: windowSeconds * 1000,
        max,
    });
    if (rate.allowed) return null;

    return NextResponse.json(
        { success: false, message: "Terlalu banyak request. Coba lagi nanti." },
        { status: 429 }
    );
}
