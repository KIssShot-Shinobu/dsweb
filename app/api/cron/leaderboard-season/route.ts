import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCronSecret, getLeaderboardDefaultElo, getLeaderboardSeasonAutoEnabled, getLeaderboardSeasonDurationDays } from "@/lib/runtime-config";
import { resetLeaderboardSeason } from "@/lib/services/leaderboard.service";

const pad = (value: number) => String(value).padStart(2, "0");

function buildSeasonName(date: Date) {
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    return `Season ${year}-${month}`;
}

export async function POST(request: Request) {
    try {
        const secret = getCronSecret();
        if (!secret) {
            return NextResponse.json({ success: false, message: "Cron secret belum dikonfigurasi" }, { status: 500 });
        }

        const provided = request.headers.get("x-cron-secret");
        if (provided !== secret) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        if (!getLeaderboardSeasonAutoEnabled()) {
            return NextResponse.json({ success: true, skipped: true, reason: "auto_disabled" });
        }

        const now = new Date();
        const activeSeason = await prisma.season.findFirst({
            where: { isActive: true },
            orderBy: { startAt: "desc" },
            select: { id: true, endAt: true },
        });

        if (activeSeason && activeSeason.endAt > now) {
            return NextResponse.json({ success: true, skipped: true, reason: "active_season" });
        }

        const durationDays = getLeaderboardSeasonDurationDays();
        const startAt = now;
        const endAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const name = buildSeasonName(startAt);

        const result = await prisma.$transaction((tx) =>
            resetLeaderboardSeason(tx, {
                name,
                startAt,
                endAt,
                defaultElo: getLeaderboardDefaultElo(),
            })
        );

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error("[Leaderboard Season Cron]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
