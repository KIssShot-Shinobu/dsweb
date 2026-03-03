import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/tournaments - Get all tournaments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const gameType = searchParams.get("gameType");

        const tournaments = await prisma.tournament.findMany({
            where: {
                ...(status && { status }),
                ...(gameType && { gameType }),
            },
            orderBy: {
                startDate: "desc",
            },
        });

        return NextResponse.json(tournaments);
    } catch (error) {
        console.error("Error fetching tournaments:", error);
        return NextResponse.json(
            { error: "Failed to fetch tournaments" },
            { status: 500 }
        );
    }
}

// POST /api/tournaments - Create a new tournament
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, gameType, startDate, prizePool, description, status } = body;

        if (!title || !gameType || !startDate) {
            return NextResponse.json(
                { error: "Title, gameType, and startDate are required" },
                { status: 400 }
            );
        }

        const tournament = await prisma.tournament.create({
            data: {
                title,
                gameType,
                startDate: new Date(startDate),
                prizePool: prizePool || 0,
                description,
                status: status || "UPCOMING",
            },
        });

        return NextResponse.json(tournament, { status: 201 });
    } catch (error) {
        console.error("Error creating tournament:", error);
        return NextResponse.json(
            { error: "Failed to create tournament" },
            { status: 500 }
        );
    }
}
