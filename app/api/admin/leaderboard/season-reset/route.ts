import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { adminSeasonResetSchema } from "@/lib/validators";
import { resetLeaderboardSeason } from "@/lib/services/leaderboard.service";
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

        const result = await prisma.$transaction((tx) =>
            resetLeaderboardSeason(tx, {
                name: parsed.data.name,
                startAt,
                endAt,
                defaultElo,
            })
        );

        return NextResponse.json({ success: true, data: result }, { status: 200 });
    } catch (error) {
        console.error("[Admin Season Reset]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
