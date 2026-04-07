import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { adminSeasonResetSchema } from "@/lib/validators";
import { applySeasonReset, getRankTier } from "@/lib/services/leaderboard.service";
import { getLeaderboardDefaultElo } from "@/lib/runtime-config";

export async function POST(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = adminSeasonResetSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const defaultElo = getLeaderboardDefaultElo();
        const startAt = new Date(parsed.data.startAt);
        const endAt = new Date(parsed.data.endAt);

        const result = await prisma.$transaction(async (tx) => {
            const activeSeason = await tx.season.findFirst({
                where: { isActive: true },
                orderBy: { startAt: "desc" },
                select: { id: true },
            });

            if (activeSeason) {
                await tx.season.updateMany({
                    where: { isActive: true },
                    data: { isActive: false },
                });
            }

            const newSeason = await tx.season.create({
                data: {
                    name: parsed.data.name,
                    startAt,
                    endAt,
                    isActive: true,
                },
            });

            const archivedSeasonId = activeSeason?.id ?? null;
            let sourceSeasonId = archivedSeasonId;
            let playerSource = await tx.leaderboardEntry.findMany({
                where: { seasonId: sourceSeasonId },
                select: { userId: true, eloRating: true, gameId: true },
            });

            let teamSource = await tx.teamLeaderboardEntry.findMany({
                where: { seasonId: sourceSeasonId },
                select: { teamId: true, eloRating: true, gameId: true },
            });

            if (sourceSeasonId && playerSource.length === 0) {
                sourceSeasonId = null;
                playerSource = await tx.leaderboardEntry.findMany({
                    where: { seasonId: null },
                    select: { userId: true, eloRating: true, gameId: true },
                });
                teamSource = await tx.teamLeaderboardEntry.findMany({
                    where: { seasonId: null },
                    select: { teamId: true, eloRating: true, gameId: true },
                });
            }

            if (sourceSeasonId && teamSource.length === 0) {
                teamSource = await tx.teamLeaderboardEntry.findMany({
                    where: { seasonId: null },
                    select: { teamId: true, eloRating: true, gameId: true },
                });
            }

            const playerPayload = playerSource.map((entry) => {
                const nextElo = applySeasonReset(entry.eloRating, defaultElo);
                return {
                    userId: entry.userId,
                    gameId: entry.gameId,
                    seasonId: newSeason.id,
                    eloRating: nextElo,
                    rankTier: getRankTier(nextElo),
                    placementMatchesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    matchesPlayed: 0,
                    lastMatchAt: null,
                };
            });

            const teamPayload = teamSource.map((entry) => {
                const nextElo = applySeasonReset(entry.eloRating, defaultElo);
                return {
                    teamId: entry.teamId,
                    gameId: entry.gameId,
                    seasonId: newSeason.id,
                    eloRating: nextElo,
                    wins: 0,
                    losses: 0,
                    matchesPlayed: 0,
                    lastMatchAt: null,
                };
            });

            if (playerPayload.length > 0) {
                await tx.leaderboardEntry.createMany({
                    data: playerPayload,
                    skipDuplicates: true,
                });
            }

            if (teamPayload.length > 0) {
                await tx.teamLeaderboardEntry.createMany({
                    data: teamPayload,
                    skipDuplicates: true,
                });
            }

            return {
                newSeason,
                archivedSeasonId,
                playersSeeded: playerPayload.length,
                teamsSeeded: teamPayload.length,
            };
        });

        return NextResponse.json({ success: true, data: result }, { status: 200 });
    } catch (error) {
        console.error("[Admin Season Reset]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
