import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leaderboardListQuerySchema } from "@/lib/validators";
import { enforceLeaderboardRateLimit } from "@/lib/leaderboard-rate-limit";

const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE = 1;
const DEFAULT_MIN_WIN_RATE = 0;

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

export async function GET(request: NextRequest) {
    try {
        const rateLimitResponse = enforceLeaderboardRateLimit(request, "players");
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
            searchBy: searchParams.get("searchBy") ?? undefined,
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
        const searchBy = parsed.data.searchBy ?? "ign";

        if (!gameId) {
            return NextResponse.json({ success: false, message: "Game wajib dipilih." }, { status: 400 });
        }

        const conditions: Prisma.Sql[] = [
            seasonId ? Prisma.sql`le."seasonId" = ${seasonId}` : Prisma.sql`le."seasonId" IS NULL`,
            Prisma.sql`le."gameId" = ${gameId}`,
        ];

        if (search) {
            const likeValue = `%${search}%`;
            if (searchBy === "user") {
                conditions.push(Prisma.sql`(u."username" ILIKE ${likeValue} OR u."fullName" ILIKE ${likeValue})`);
            } else {
                conditions.push(Prisma.sql`(pga."ign" ILIKE ${likeValue})`);
            }
        }

        if (tier) {
            conditions.push(Prisma.sql`le.rankTier = ${tier}`);
        }

        if (minWinRate > 0) {
            conditions.push(Prisma.sql`COALESCE(CAST(le."wins" AS float) / NULLIF(le."matchesPlayed", 0), 0) >= ${minWinRate}`);
        }

        const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

        const rowsPromise = Prisma.sql`
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
                ${whereSql}
            ) ranked
            ORDER BY ranked.rank_position ASC
            LIMIT ${limit} OFFSET ${skip}
        `;

        const totalPromise = Prisma.sql`
            SELECT COUNT(*) AS total
            FROM "LeaderboardEntry" le
            JOIN "User" u ON u."id" = le."userId"
            JOIN "Game" g ON g."id" = le."gameId"
            LEFT JOIN "PlayerGameAccount" pga ON pga."userId" = le."userId" AND pga."gameId" = le."gameId"
            ${whereSql}
        `;

        const [rows, totalRows] = await Promise.all([
            prisma.$queryRaw<RankedPlayerRow[]>(rowsPromise),
            prisma.$queryRaw<{ total: number }[]>(totalPromise),
        ]);

        const total = Number(totalRows[0]?.total ?? 0);

        const data = rows.map((entry) => {
            const rankValue = typeof entry.rankPosition === "bigint" ? Number(entry.rankPosition) : entry.rankPosition;
            const matchesPlayed = entry.matchesPlayed || 0;
            const winRate = matchesPlayed > 0 ? entry.wins / matchesPlayed : 0;
            return {
                rank: rankValue,
                eloRating: entry.eloRating,
                rankTier: entry.rankTier,
                wins: entry.wins,
                losses: entry.losses,
                matchesPlayed,
                winRate,
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
            };
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({ success: true, data, seasonId, gameId, searchBy, page, limit, total, totalPages }, { status: 200 });
    } catch (error) {
        console.error("[Leaderboard Players]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
