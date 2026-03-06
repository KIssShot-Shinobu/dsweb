import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GameType } from "@prisma/client";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const [tournamentsJoined, gameProfiles, winLogs] = await Promise.all([
            prisma.tournamentParticipant.count({
                where: { userId: user.id },
            }),
            prisma.gameProfile.findMany({
                where: { userId: user.id },
                select: { gameType: true, screenshotUrl: true },
            }),
            prisma.reputationLog.findMany({
                where: {
                    userId: user.id,
                    points: { gt: 0 },
                    sourceType: { in: ["tournament_win", "tournament_prize"] },
                },
                select: { sourceId: true, sourceType: true },
            }),
        ]);

        const winTournamentIds = Array.from(
            new Set(winLogs.map((l) => l.sourceId).filter((v): v is string => Boolean(v)))
        );

        const tournamentsWon = winTournamentIds.length;

        let totalPrizeWon = 0;
        if (winTournamentIds.length > 0) {
            const wonTournaments = await prisma.tournament.findMany({
                where: { id: { in: winTournamentIds } },
                select: { id: true, prizePool: true },
            });
            totalPrizeWon = wonTournaments.reduce((sum, t) => sum + (t.prizePool || 0), 0);
        }

        const verifiedGameAccounts = Array.from(
            new Set(
                gameProfiles
                    .filter((profile) => Boolean(profile.screenshotUrl))
                    .map((profile) => profile.gameType)
            )
        ) as GameType[];

        const winRate = tournamentsJoined > 0 ? tournamentsWon / tournamentsJoined : 0;

        return NextResponse.json({
            success: true,
            stats: {
                tournamentsJoined,
                tournamentsWon,
                winRate,
                totalPrizeWon,
                memberSince: user.createdAt.toISOString().slice(0, 10),
                lastActive: user.lastActiveAt.toISOString(),
                verifiedGameAccounts,
            },
        });
    } catch (error) {
        console.error("[Profile Stats API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
