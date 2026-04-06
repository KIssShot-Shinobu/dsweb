import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leaderboardListQuerySchema } from "@/lib/validators";
import { getTopPlayers } from "@/lib/services/leaderboard.service";

const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const seasonIdParam = searchParams.get("seasonId")?.trim() || undefined;
        const payload = {
            limit: searchParams.get("limit") ?? undefined,
            seasonId: seasonIdParam || undefined,
        };
        const parsed = leaderboardListQuerySchema.safeParse(payload);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const limit = parsed.data.limit ?? DEFAULT_LIMIT;
        const seasonId = parsed.data.seasonId ?? null;
        const entries = await getTopPlayers(prisma, { limit, seasonId });

        const data = entries.map((entry, index) => {
            const matchesPlayed = entry.matchesPlayed || 0;
            const winRate = matchesPlayed > 0 ? entry.wins / matchesPlayed : 0;
            return {
                rank: index + 1,
                id: entry.id,
                eloRating: entry.eloRating,
                rankTier: entry.rankTier,
                wins: entry.wins,
                losses: entry.losses,
                matchesPlayed,
                winRate,
                lastMatchAt: entry.lastMatchAt ? entry.lastMatchAt.toISOString() : null,
                user: entry.user,
            };
        });

        return NextResponse.json({ success: true, data, seasonId }, { status: 200 });
    } catch (error) {
        console.error("[Leaderboard Players]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
