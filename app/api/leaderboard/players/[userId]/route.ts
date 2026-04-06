import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leaderboardListQuerySchema, leaderboardUserParamsSchema } from "@/lib/validators";
import { leaderboardSeasonFilter } from "@/lib/services/leaderboard.service";

const NEIGHBOR_WINDOW = 5;

type RankedPlayerRow = {
    rank: number;
    userId: string;
    eloRating: number;
    rankTier: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    lastMatchAt: Date | null;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const { userId } = await params;
        const parsedParams = leaderboardUserParamsSchema.safeParse({ userId });
        if (!parsedParams.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsedParams.error.flatten().fieldErrors }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const seasonIdParam = searchParams.get("seasonId")?.trim() || undefined;
        const parsedQuery = leaderboardListQuerySchema.safeParse({ seasonId: seasonIdParam || undefined });
        if (!parsedQuery.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsedQuery.error.flatten().fieldErrors }, { status: 400 });
        }

        const seasonId = parsedQuery.data.seasonId ?? null;
        const seasonFilter = leaderboardSeasonFilter(seasonId);

        const targetRows = await prisma.$queryRaw<{ rank: number }[]>`
            SELECT ranked.rank FROM (
                SELECT le.userId,
                       ROW_NUMBER() OVER (ORDER BY le.eloRating DESC, le.updatedAt ASC, le.id ASC) AS rank
                FROM LeaderboardEntry le
                WHERE ${seasonFilter}
            ) ranked
            WHERE ranked.userId = ${userId}
        `;

        const targetRankValue = targetRows[0]?.rank;
        const targetRank = typeof targetRankValue === "bigint" ? Number(targetRankValue) : targetRankValue;
        if (!targetRank) {
            return NextResponse.json({ success: false, message: "Leaderboard entry tidak ditemukan" }, { status: 404 });
        }

        const startRank = Math.max(1, targetRank - NEIGHBOR_WINDOW);
        const endRank = targetRank + NEIGHBOR_WINDOW;

        const neighbors = await prisma.$queryRaw<RankedPlayerRow[]>`
            SELECT ranked.rank,
                   ranked.userId,
                   ranked.eloRating,
                   ranked.rankTier,
                   ranked.wins,
                   ranked.losses,
                   ranked.matchesPlayed,
                   ranked.lastMatchAt,
                   u.username,
                   u.fullName,
                   u.avatarUrl
            FROM (
                SELECT le.id,
                       le.userId,
                       le.eloRating,
                       le.rankTier,
                       le.wins,
                       le.losses,
                       le.matchesPlayed,
                       le.lastMatchAt,
                       le.updatedAt,
                       ROW_NUMBER() OVER (ORDER BY le.eloRating DESC, le.updatedAt ASC, le.id ASC) AS rank
                FROM LeaderboardEntry le
                WHERE ${seasonFilter}
            ) ranked
            JOIN User u ON u.id = ranked.userId
            WHERE ranked.rank BETWEEN ${startRank} AND ${endRank}
            ORDER BY ranked.rank ASC
        `;

        const targetEntry = neighbors.find((entry) => entry.userId === userId);
        if (!targetEntry) {
            return NextResponse.json({ success: false, message: "Leaderboard entry tidak ditemukan" }, { status: 404 });
        }

        const normalizedNeighbors = neighbors.map((entry) => ({
            rank: typeof entry.rank === "bigint" ? Number(entry.rank) : entry.rank,
            eloRating: entry.eloRating,
            rankTier: entry.rankTier,
            wins: entry.wins,
            losses: entry.losses,
            matchesPlayed: entry.matchesPlayed,
            winRate: entry.matchesPlayed > 0 ? entry.wins / entry.matchesPlayed : 0,
            lastMatchAt: entry.lastMatchAt ? entry.lastMatchAt.toISOString() : null,
            user: {
                id: entry.userId,
                username: entry.username,
                fullName: entry.fullName,
                avatarUrl: entry.avatarUrl,
            },
        }));

        return NextResponse.json({
            success: true,
            data: {
                rank: targetRank,
                eloRating: targetEntry.eloRating,
                rankTier: targetEntry.rankTier,
                wins: targetEntry.wins,
                losses: targetEntry.losses,
                matchesPlayed: targetEntry.matchesPlayed,
                winRate: targetEntry.matchesPlayed > 0 ? targetEntry.wins / targetEntry.matchesPlayed : 0,
                lastMatchAt: targetEntry.lastMatchAt ? targetEntry.lastMatchAt.toISOString() : null,
                neighbors: normalizedNeighbors,
            },
            seasonId,
        }, { status: 200 });
    } catch (error) {
        console.error("[Leaderboard Player Rank]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
