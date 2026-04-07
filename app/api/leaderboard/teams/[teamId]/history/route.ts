import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leaderboardListQuerySchema, leaderboardTeamParamsSchema } from "@/lib/validators";

const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
    try {
        const { teamId } = await params;
        const parsedParams = leaderboardTeamParamsSchema.safeParse({ teamId });
        if (!parsedParams.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsedParams.error.flatten().fieldErrors }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const seasonIdParam = searchParams.get("seasonId")?.trim() || undefined;
        const payload = {
            limit: searchParams.get("limit") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            seasonId: seasonIdParam || undefined,
            gameId: searchParams.get("gameId") ?? undefined,
        };
        const parsedQuery = leaderboardListQuerySchema.safeParse(payload);
        if (!parsedQuery.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsedQuery.error.flatten().fieldErrors }, { status: 400 });
        }

        const limit = parsedQuery.data.limit ?? DEFAULT_LIMIT;
        const page = parsedQuery.data.page ?? DEFAULT_PAGE;
        const skip = (page - 1) * limit;
        const seasonId = parsedQuery.data.seasonId ?? null;
        const gameId = parsedQuery.data.gameId ?? null;

        if (!gameId) {
            return NextResponse.json({ success: false, message: "Game wajib dipilih." }, { status: 400 });
        }

        const [entries, total] = await Promise.all([
            prisma.leaderboardHistory.findMany({
                where: { teamId, seasonId, gameId },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.leaderboardHistory.count({ where: { teamId, seasonId, gameId } }),
        ]);

        const data = entries.map((entry) => ({
            id: entry.id,
            matchId: entry.matchId,
            seasonId: entry.seasonId,
            eloBefore: entry.eloBefore,
            eloAfter: entry.eloAfter,
            delta: entry.delta,
            createdAt: entry.createdAt.toISOString(),
        }));

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({
            success: true,
            data,
            seasonId,
            gameId,
            page,
            limit,
            total,
            totalPages,
        }, { status: 200 });
    } catch (error) {
        console.error("[Leaderboard Team History]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
