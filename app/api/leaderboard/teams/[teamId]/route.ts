import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leaderboardListQuerySchema, leaderboardTeamParamsSchema } from "@/lib/validators";
import { getRankTier } from "@/lib/services/leaderboard.service";

const NEIGHBOR_WINDOW = 5;

type RankedTeamRow = {
    rank: number;
    teamId: string;
    gameId: string;
    eloRating: number;
    wins: number;
    losses: number;
    matchesPlayed: number;
    lastMatchAt: Date | null;
    name: string;
    slug: string;
    logoUrl: string | null;
    gameName: string;
    gameCode: string;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
    try {
        const { teamId } = await params;
        const parsedParams = leaderboardTeamParamsSchema.safeParse({ teamId });
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
        const seasonFilter = seasonId
            ? Prisma.sql`tle.seasonId = ${seasonId} AND tle.gameId = ${gameId}`
            : Prisma.sql`tle.seasonId IS NULL AND tle.gameId = ${gameId}`;

        const targetRows = await prisma.$queryRaw<{ rank: number }[]>`
            SELECT ranked.rank FROM (
                SELECT tle.teamId,
                       ROW_NUMBER() OVER (ORDER BY tle.eloRating DESC, tle.updatedAt ASC, tle.id ASC) AS rank
                FROM TeamLeaderboardEntry tle
                WHERE ${seasonFilter}
            ) ranked
            WHERE ranked.teamId = ${teamId}
        `;

        const targetRankValue = targetRows[0]?.rank;
        const targetRank = typeof targetRankValue === "bigint" ? Number(targetRankValue) : targetRankValue;
        if (!targetRank) {
            return NextResponse.json({ success: false, message: "Leaderboard entry tidak ditemukan" }, { status: 404 });
        }

        const startRank = Math.max(1, targetRank - NEIGHBOR_WINDOW);
        const endRank = targetRank + NEIGHBOR_WINDOW;

        const neighbors = await prisma.$queryRaw<RankedTeamRow[]>`
            SELECT ranked.rank,
                   ranked.teamId,
                   ranked.gameId,
                   ranked.eloRating,
                   ranked.wins,
                   ranked.losses,
                   ranked.matchesPlayed,
                   ranked.lastMatchAt,
                   t.name,
                   t.slug,
                   t.logoUrl,
                   ranked.gameName,
                   ranked.gameCode
            FROM (
                SELECT tle.id,
                       tle.teamId,
                       tle.gameId,
                       tle.eloRating,
                       tle.wins,
                       tle.losses,
                       tle.matchesPlayed,
                       tle.lastMatchAt,
                       tle.updatedAt,
                       g.name AS gameName,
                       g.code AS gameCode,
                       ROW_NUMBER() OVER (ORDER BY tle.eloRating DESC, tle.updatedAt ASC, tle.id ASC) AS rank
                FROM TeamLeaderboardEntry tle
                JOIN Game g ON g.id = tle.gameId
                WHERE ${seasonFilter}
            ) ranked
            JOIN Team t ON t.id = ranked.teamId
            WHERE ranked.rank BETWEEN ${startRank} AND ${endRank}
            ORDER BY ranked.rank ASC
        `;

        const targetEntry = neighbors.find((entry) => entry.teamId === teamId);
        if (!targetEntry) {
            return NextResponse.json({ success: false, message: "Leaderboard entry tidak ditemukan" }, { status: 404 });
        }

        const normalizedNeighbors = neighbors.map((entry) => {
            const rankValue = typeof entry.rank === "bigint" ? Number(entry.rank) : entry.rank;
            const winRate = entry.matchesPlayed > 0 ? entry.wins / entry.matchesPlayed : 0;
            return {
                rank: rankValue,
                eloRating: entry.eloRating,
                rankTier: getRankTier(entry.eloRating),
                wins: entry.wins,
                losses: entry.losses,
                matchesPlayed: entry.matchesPlayed,
                winRate,
                lastMatchAt: entry.lastMatchAt ? entry.lastMatchAt.toISOString() : null,
                team: {
                    id: entry.teamId,
                    name: entry.name,
                    slug: entry.slug,
                    logoUrl: entry.logoUrl,
                },
                game: {
                    id: entry.gameId,
                    name: entry.gameName,
                    code: entry.gameCode,
                },
            };
        });

        const targetWinRate = targetEntry.matchesPlayed > 0 ? targetEntry.wins / targetEntry.matchesPlayed : 0;

        return NextResponse.json({
            success: true,
            data: {
                rank: targetRank,
                eloRating: targetEntry.eloRating,
                rankTier: getRankTier(targetEntry.eloRating),
                wins: targetEntry.wins,
                losses: targetEntry.losses,
                matchesPlayed: targetEntry.matchesPlayed,
                winRate: targetWinRate,
                lastMatchAt: targetEntry.lastMatchAt ? targetEntry.lastMatchAt.toISOString() : null,
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
        console.error("[Leaderboard Team Rank]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
