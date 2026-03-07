import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";

type Params = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const transaction = await prisma.treasury.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        fullName: true,
                    },
                },
            },
        });

        if (!transaction) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        return NextResponse.json(transaction);
    } catch (error) {
        console.error("Error fetching transaction:", error);
        return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
    try {
        const token = await getTokenFromCookie();
        const decoded = token ? await verifyToken(token) : null;
        if (!decoded || !["ADMIN", "FOUNDER"].includes(decoded.role)) {
            return NextResponse.json({ error: "Akses Ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { amount, description, userId } = body;

        const previous = await prisma.treasury.findUnique({ where: { id } });

        const transaction = await prisma.treasury.update({
            where: { id },
            data: {
                ...(amount !== undefined && { amount }),
                ...(description && { description }),
                ...(userId !== undefined && { userId }),
            },
            include: {
                user: {
                    select: {
                        fullName: true,
                    },
                },
            },
        });

        await logAudit({
            userId: decoded.userId,
            action: "TREASURY_UPDATED",
            targetId: transaction.id,
            targetType: "Treasury",
            details: {
                before: previous
                    ? {
                        amount: previous.amount,
                        description: previous.description,
                        userId: previous.userId,
                    }
                    : null,
                after: {
                    amount: transaction.amount,
                    description: transaction.description,
                    userId: transaction.userId,
                },
            },
        });

        return NextResponse.json(transaction);
    } catch (error: unknown) {
        console.error("Error updating transaction:", error);
        if (error instanceof Error && error.message.includes("Record to update not found")) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    try {
        const token = await getTokenFromCookie();
        const decoded = token ? await verifyToken(token) : null;
        if (!decoded || !["ADMIN", "FOUNDER"].includes(decoded.role)) {
            return NextResponse.json({ error: "Akses Ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const deleted = await prisma.treasury.delete({
            where: { id },
        });

        await logAudit({
            userId: decoded.userId,
            action: "TREASURY_DELETED",
            targetId: id,
            targetType: "Treasury",
            details: {
                amount: deleted.amount,
                description: deleted.description,
                userId: deleted.userId,
            },
        });

        return NextResponse.json({ message: "Transaction deleted successfully" });
    } catch (error: unknown) {
        console.error("Error deleting transaction:", error);
        if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
    }
}
