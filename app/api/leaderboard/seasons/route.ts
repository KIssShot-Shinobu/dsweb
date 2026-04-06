import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const seasons = await prisma.season.findMany({
            orderBy: [{ isActive: "desc" }, { startAt: "desc" }],
            select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
                isActive: true,
            },
        });

        const data = seasons.map((season) => ({
            ...season,
            startAt: season.startAt.toISOString(),
            endAt: season.endAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        console.error("[Leaderboard Seasons]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
