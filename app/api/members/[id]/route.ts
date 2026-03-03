import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = Promise<{ id: string }>;

// GET /api/members/[id] - Get a single member
export async function GET(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const member = await prisma.member.findUnique({
            where: { id },
            include: {
                transactions: true,
            },
        });

        if (!member) {
            return NextResponse.json(
                { error: "Member not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(member);
    } catch (error) {
        console.error("Error fetching member:", error);
        return NextResponse.json(
            { error: "Failed to fetch member" },
            { status: 500 }
        );
    }
}

// PUT /api/members/[id] - Update a member
export async function PUT(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, gameId, rank, role } = body;

        const member = await prisma.member.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(gameId && { gameId }),
                ...(rank !== undefined && { rank }),
                ...(role && { role }),
            },
        });

        return NextResponse.json(member);
    } catch (error: unknown) {
        console.error("Error updating member:", error);
        if (error instanceof Error && error.message.includes("Record to update not found")) {
            return NextResponse.json(
                { error: "Member not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Failed to update member" },
            { status: 500 }
        );
    }
}

// DELETE /api/members/[id] - Delete a member
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        await prisma.member.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Member deleted successfully" });
    } catch (error: unknown) {
        console.error("Error deleting member:", error);
        if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
            return NextResponse.json(
                { error: "Member not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Failed to delete member" },
            { status: 500 }
        );
    }
}
