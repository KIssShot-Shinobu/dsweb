import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leaderboardListQuerySchema } from "@/lib/validators";
import { getRankTier } from "@/lib/services/leaderboard.service";
import { enforceLeaderboardRateLimit } from "@/lib/leaderboard-rate-limit";

const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE = 1;
const DEFAULT_MIN_WIN_RATE = 0;

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

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceLeaderboardRateLimit(request, "teams");
        if (rateLimitResponse) return rateLimitResponse;

        const { searchParams } = new URL(request.url);
        const seasonIdParam = searchParams.get("seasonId")?.trim() || undefined;
        const payload = {
            limit: searchParams.get("limit") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            search: searchParams.get("search") ?? undefined,
            tier: searchParams.get("tier") ?? undefined,
            minWinRate: searchParams.get("minWinRate") ?? undefined,
            seasonId: seasonIdParam || undefined,
            gameId: searchParams.get("gameId") ?? undefined,
        };
        const parsed = leaderboardListQuerySchema.safeParse(payload);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const limit = parsed.data.limit ?? DEFAULT_LIMIT;
        const page = parsed.data.page ?? DEFAULT_PAGE;
        const skip = (page - 1) * limit;
        const seasonId = parsed.data.seasonId ?? null;
        const gameId = parsed.data.gameId ?? null;
        const search = parsed.data.search?.trim() ?? "";
        const tier = parsed.data.tier ?? null;
        const minWinRate = parsed.data.minWinRate ?? DEFAULT_MIN_WIN_RATE;

        if (!gameId) {
            return NextResponse.json({ success: false, message: "Game wajib dipilih." }, { status: 400 });
        }

        const conditions: Prisma.Sql[] = [
            seasonId ? Prisma.sql`tle.seasonId = ${seasonId}` : Prisma.sql`tle.seasonId IS NULL`,
            Prisma.sql`tle.gameId = ${gameId}`,
        ];

        if (search) {
            const likeValue = `%${search}%`;
            conditions.push(Prisma.sql`(t.name LIKE ${likeValue} OR t.slug LIKE ${likeValue})`);
        }

        if (tier) {
            const bounds = {
                Bronze: { min: null, max: 1200 },
                Silver: { min: 1200, max: 1500 },
                Gold: { min: 1500, max: 1800 },
                Platinum: { min: 1800, max: 2100 },
                Diamond: { min: 2100, max: null },
            } as const;
            const range = bounds[tier];
            if (range.min !== null) {
                conditions.push(Prisma.sql`tle.eloRating >= ${range.min}`);
            }
            if (range.max !== null) {
                conditions.push(Prisma.sql`tle.eloRating < ${range.max}`);
            }
        }

        if (minWinRate > 0) {
            conditions.push(Prisma.sql`COALESCE(tle.wins / NULLIF(tle.matchesPlayed, 0), 0) >= ${minWinRate}`);
        }

        const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

        const rowsPromise = Prisma.sql`
            SELECT ranked.rank,
                   ranked.teamId,
                   ranked.gameId,
                   ranked.eloRating,
                   ranked.wins,
                   ranked.losses,
                   ranked.matchesPlayed,
                   ranked.lastMatchAt,
                   ranked.name,
                   ranked.slug,
                   ranked.logoUrl,
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
                       t.name,
                       t.slug,
                       t.logoUrl,
                       g.name AS gameName,
                       g.code AS gameCode,
                       ROW_NUMBER() OVER (ORDER BY tle.eloRating DESC, tle.updatedAt ASC, tle.id ASC) AS rank
                FROM TeamLeaderboardEntry tle
                JOIN Team t ON t.id = tle.teamId
                JOIN Game g ON g.id = tle.gameId
                ${whereSql}
            ) ranked
            ORDER BY ranked.rank ASC
            LIMIT ${limit} OFFSET ${skip}
        `;

        const totalPromise = Prisma.sql`
            SELECT COUNT(*) AS total
            FROM TeamLeaderboardEntry tle
            JOIN Team t ON t.id = tle.teamId
            JOIN Game g ON g.id = tle.gameId
            ${whereSql}
        `;

        const [rows, totalRows] = await Promise.all([
            prisma.$queryRaw<RankedTeamRow[]>(rowsPromise),
            prisma.$queryRaw<{ total: number }[]>(totalPromise),
        ]);

        const total = Number(totalRows[0]?.total ?? 0);
        const data = rows.map((entry) => {
            const rankValue = typeof entry.rank === "bigint" ? Number(entry.rank) : entry.rank;
            const matchesPlayed = entry.matchesPlayed || 0;
            const winRate = matchesPlayed > 0 ? entry.wins / matchesPlayed : 0;
            return {
                rank: rankValue,
                eloRating: entry.eloRating,
                rankTier: getRankTier(entry.eloRating),
                wins: entry.wins,
                losses: entry.losses,
                matchesPlayed,
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

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({ success: true, data, seasonId, gameId, page, limit, total, totalPages }, { status: 200 });
    } catch (error) {
        console.error("[Leaderboard Teams]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
