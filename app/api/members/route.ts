import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/members - Get all members
export async function GET() {
    try {
        const members = await prisma.member.findMany({
            include: {
                transactions: true,
            },
            orderBy: {
                joinedAt: "desc",
            },
        });
        return NextResponse.json(members);
    } catch (error) {
        console.error("Error fetching members:", error);
        return NextResponse.json(
            { error: "Failed to fetch members" },
            { status: 500 }
        );
    }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, gameId, rank, role } = body;

        if (!name || !gameId) {
            return NextResponse.json(
                { error: "Name and gameId are required" },
                { status: 400 }
            );
        }

        const member = await prisma.member.create({
            data: {
                name,
                gameId,
                rank,
                role: role || "MEMBER",
            },
        });

        return NextResponse.json(member, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating member:", error);
        if (
            error instanceof Error &&
            error.message.includes("Unique constraint")
        ) {
            return NextResponse.json(
                { error: "A member with this gameId already exists" },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: "Failed to create member" },
            { status: 500 }
        );
    }
}
