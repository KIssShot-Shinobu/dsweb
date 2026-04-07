import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leaderboardUserParamsSchema } from "@/lib/validators";

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const { userId } = await params;
        const parsedParams = leaderboardUserParamsSchema.safeParse({ userId });
        if (!parsedParams.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsedParams.error.flatten().fieldErrors }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const gameId = searchParams.get("gameId")?.trim() || null;
        if (!gameId) {
            return NextResponse.json({ success: false, message: "Game wajib dipilih." }, { status: 400 });
        }

        const entries = await prisma.leaderboardEntry.findMany({
            where: { userId, gameId },
            include: {
                season: {
                    select: { id: true, name: true, startAt: true, endAt: true, isActive: true },
                },
            },
        });

        const sorted = entries.slice().sort((a, b) => {
            if (a.seasonId === null && b.seasonId !== null) return -1;
            if (a.seasonId !== null && b.seasonId === null) return 1;
            if (a.season?.startAt && b.season?.startAt) {
                return b.season.startAt.getTime() - a.season.startAt.getTime();
            }
            return 0;
        });

        const data = sorted.map((entry) => {
            const matchesPlayed = entry.matchesPlayed || 0;
            const winRate = matchesPlayed > 0 ? entry.wins / matchesPlayed : 0;
            return {
                seasonId: entry.seasonId,
                seasonName: entry.season?.name ?? null,
                seasonActive: entry.season?.isActive ?? false,
                seasonStartAt: entry.season?.startAt ? entry.season.startAt.toISOString() : null,
                seasonEndAt: entry.season?.endAt ? entry.season.endAt.toISOString() : null,
                eloRating: entry.eloRating,
                rankTier: entry.rankTier,
                wins: entry.wins,
                losses: entry.losses,
                matchesPlayed,
                winRate,
                lastMatchAt: entry.lastMatchAt ? entry.lastMatchAt.toISOString() : null,
            };
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        console.error("[Leaderboard Player Seasons]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
