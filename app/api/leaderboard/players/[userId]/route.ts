import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leaderboardListQuerySchema, leaderboardUserParamsSchema } from "@/lib/validators";
import { leaderboardSeasonGameFilter } from "@/lib/services/leaderboard.service";
import { enforceLeaderboardRateLimit } from "@/lib/leaderboard-rate-limit";

const NEIGHBOR_WINDOW = 5;

type RankedPlayerRow = {
    rank: number;
    userId: string;
    gameId: string;
    eloRating: number;
    rankTier: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    lastMatchAt: Date | null;
    ign: string | null;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    gameName: string;
    gameCode: string;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const rateLimitResponse = enforceLeaderboardRateLimit(request, "players:detail");
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = await params;
        const parsedParams = leaderboardUserParamsSchema.safeParse({ userId });
        if (!parsedParams.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsedParams.error.flatten().fieldErrors }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const seasonIdParam = searchParams.get("seasonId")?.trim() || undefined;
        const parsedQuery = leaderboardListQuerySchema.safeParse({
            seasonId: seasonIdParam || undefined,
            gameId: searchParams.get("gameId") ?? undefined,
        });
        if (!parsedQuery.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsedQuery.error.flatten().fieldErrors }, { status: 400 });
        }

        const seasonId = parsedQuery.data.seasonId ?? null;
        const gameId = parsedQuery.data.gameId ?? null;
        if (!gameId) {
            return NextResponse.json({ success: false, message: "Game wajib dipilih." }, { status: 400 });
        }

        const seasonFilter = leaderboardSeasonGameFilter(seasonId, gameId);

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
                   ranked.gameId,
                   ranked.eloRating,
                   ranked.rankTier,
                   ranked.wins,
                   ranked.losses,
                   ranked.matchesPlayed,
                   ranked.lastMatchAt,
                   ranked.ign,
                   u.username,
                   u.fullName,
                   u.avatarUrl,
                   ranked.gameName,
                   ranked.gameCode
            FROM (
                SELECT le.id,
                       le.userId,
                       le.gameId,
                       le.eloRating,
                       le.rankTier,
                       le.wins,
                       le.losses,
                       le.matchesPlayed,
                       le.lastMatchAt,
                       le.updatedAt,
                       pga.ign,
                       g.name AS gameName,
                       g.code AS gameCode,
                       ROW_NUMBER() OVER (ORDER BY le.eloRating DESC, le.updatedAt ASC, le.id ASC) AS rank
                FROM LeaderboardEntry le
                JOIN Game g ON g.id = le.gameId
                LEFT JOIN PlayerGameAccount pga ON pga.userId = le.userId AND pga.gameId = le.gameId
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
                ign: entry.ign,
                username: entry.username,
                fullName: entry.fullName,
                avatarUrl: entry.avatarUrl,
            },
            game: {
                id: entry.gameId,
                name: entry.gameName,
                code: entry.gameCode,
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
                ign: targetEntry.ign,
                game: {
                    id: targetEntry.gameId,
                    name: targetEntry.gameName,
                    code: targetEntry.gameCode,
                },
                neighbors: normalizedNeighbors,
            },
            seasonId,
            gameId,
        }, { status: 200 });
    } catch (error) {
        console.error("[Leaderboard Player Rank]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
