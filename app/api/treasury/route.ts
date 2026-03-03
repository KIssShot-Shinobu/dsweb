import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/treasury - Get all transactions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get("memberId");

        const transactions = await prisma.treasury.findMany({
            where: {
                ...(memberId && { memberId }),
            },
            include: {
                member: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Calculate total balance
        const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

        return NextResponse.json({
            transactions,
            balance,
        });
    } catch (error) {
        console.error("Error fetching treasury:", error);
        return NextResponse.json(
            { error: "Failed to fetch treasury" },
            { status: 500 }
        );
    }
}

// POST /api/treasury - Create a new transaction
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { amount, description, memberId } = body;

        if (amount === undefined || !description) {
            return NextResponse.json(
                { error: "Amount and description are required" },
                { status: 400 }
            );
        }

        const transaction = await prisma.treasury.create({
            data: {
                amount,
                description,
                memberId: memberId || null,
            },
            include: {
                member: true,
            },
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json(
            { error: "Failed to create transaction" },
            { status: 500 }
        );
    }
}
