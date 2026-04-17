import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leaderboardListQuerySchema, leaderboardUserParamsSchema } from "@/lib/validators";
import { leaderboardSeasonGameFilter } from "@/lib/services/leaderboard.service";
import { enforceLeaderboardRateLimit } from "@/lib/leaderboard-rate-limit";

const NEIGHBOR_WINDOW = 5;

type RankedPlayerRow = {
    rankPosition: number;
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

        const targetRows = await prisma.$queryRaw<{ rankPosition: number }[]>`
            SELECT ranked.rank_position AS "rankPosition"
            FROM (
                SELECT ROW_NUMBER() OVER (ORDER BY le."eloRating" DESC, le."updatedAt" ASC, le."id" ASC) AS rank_position,
                       le."userId" AS "userId"
                FROM "LeaderboardEntry" le
                WHERE ${seasonFilter}
            ) ranked
            WHERE ranked."userId" = ${userId}
        `;

        const targetRankValue = targetRows[0]?.rankPosition;
        const targetRank = typeof targetRankValue === "bigint" ? Number(targetRankValue) : targetRankValue;
        if (!targetRank) {
            return NextResponse.json({ success: false, message: "Leaderboard entry tidak ditemukan" }, { status: 404 });
        }

        const startRank = Math.max(1, targetRank - NEIGHBOR_WINDOW);
        const endRank = targetRank + NEIGHBOR_WINDOW;

        const neighbors = await prisma.$queryRaw<RankedPlayerRow[]>`
            SELECT ranked.rank_position AS "rankPosition",
                   ranked."userId",
                   ranked."gameId",
                   ranked."eloRating",
                   ranked."rankTier",
                   ranked."wins",
                   ranked."losses",
                   ranked."matchesPlayed",
                   ranked."lastMatchAt",
                   ranked."ign",
                   ranked."username",
                   ranked."fullName",
                   ranked."avatarUrl",
                   ranked."gameName",
                   ranked."gameCode"
            FROM (
                SELECT ROW_NUMBER() OVER (ORDER BY le."eloRating" DESC, le."updatedAt" ASC, le."id" ASC) AS rank_position,
                       le."userId" AS "userId",
                       le."gameId" AS "gameId",
                       le."eloRating" AS "eloRating",
                       le."rankTier" AS "rankTier",
                       le."wins" AS "wins",
                       le."losses" AS "losses",
                       le."matchesPlayed" AS "matchesPlayed",
                       le."lastMatchAt" AS "lastMatchAt",
                       pga."ign" AS "ign",
                       u."username" AS "username",
                       u."fullName" AS "fullName",
                       u."avatarUrl" AS "avatarUrl",
                       g."name" AS "gameName",
                       g."code" AS "gameCode"
                FROM "LeaderboardEntry" le
                JOIN "User" u ON u."id" = le."userId"
                JOIN "Game" g ON g."id" = le."gameId"
                LEFT JOIN "PlayerGameAccount" pga ON pga."userId" = le."userId" AND pga."gameId" = le."gameId"
                WHERE ${seasonFilter}
            ) ranked
            WHERE ranked.rank_position BETWEEN ${startRank} AND ${endRank}
            ORDER BY ranked.rank_position ASC
        `;

        const targetEntry = neighbors.find((entry) => entry.userId === userId);
        if (!targetEntry) {
            return NextResponse.json({ success: false, message: "Leaderboard entry tidak ditemukan" }, { status: 404 });
        }

        const normalizedNeighbors = neighbors.map((entry) => ({
            rank: typeof entry.rankPosition === "bigint" ? Number(entry.rankPosition) : entry.rankPosition,
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
