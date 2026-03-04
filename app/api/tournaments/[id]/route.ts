import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = Promise<{ id: string }>;

// GET /api/tournaments/[id] - Get a single tournament
export async function GET(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
        });

        if (!tournament) {
            return NextResponse.json(
                { error: "Tournament not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(tournament);
    } catch (error) {
        console.error("Error fetching tournament:", error);
        return NextResponse.json(
            { error: "Failed to fetch tournament" },
            { status: 500 }
        );
    }
}

// PUT /api/tournaments/[id] - Update a tournament
export async function PUT(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, gameType, startDate, prizePool, description, status, image } = body;

        const tournament = await prisma.tournament.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(gameType && { gameType }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(prizePool !== undefined && { prizePool }),
                ...(description !== undefined && { description }),
                ...(status && { status }),
                ...(image !== undefined && { image }),
            },
        });

        return NextResponse.json(tournament);
    } catch (error: unknown) {
        console.error("Error updating tournament:", error);
        if (error instanceof Error && error.message.includes("Record to update not found")) {
            return NextResponse.json(
                { error: "Tournament not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Failed to update tournament" },
            { status: 500 }
        );
    }
}

// DELETE /api/tournaments/[id] - Delete a tournament
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        await prisma.tournament.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Tournament deleted successfully" });
    } catch (error: unknown) {
        console.error("Error deleting tournament:", error);
        if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
            return NextResponse.json(
                { error: "Tournament not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Failed to delete tournament" },
            { status: 500 }
        );
    }
}
