import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = Promise<{ id: string }>;

// GET /api/treasury/[id] - Get a single transaction
export async function GET(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const transaction = await prisma.treasury.findUnique({
            where: { id },
            include: {
                member: true,
            },
        });

        if (!transaction) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(transaction);
    } catch (error) {
        console.error("Error fetching transaction:", error);
        return NextResponse.json(
            { error: "Failed to fetch transaction" },
            { status: 500 }
        );
    }
}

// PUT /api/treasury/[id] - Update a transaction
export async function PUT(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { amount, description, memberId } = body;

        const transaction = await prisma.treasury.update({
            where: { id },
            data: {
                ...(amount !== undefined && { amount }),
                ...(description && { description }),
                ...(memberId !== undefined && { memberId }),
            },
            include: {
                member: true,
            },
        });

        return NextResponse.json(transaction);
    } catch (error: unknown) {
        console.error("Error updating transaction:", error);
        if (error instanceof Error && error.message.includes("Record to update not found")) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Failed to update transaction" },
            { status: 500 }
        );
    }
}

// DELETE /api/treasury/[id] - Delete a transaction
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        await prisma.treasury.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Transaction deleted successfully" });
    } catch (error: unknown) {
        console.error("Error deleting transaction:", error);
        if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Failed to delete transaction" },
            { status: 500 }
        );
    }
}
