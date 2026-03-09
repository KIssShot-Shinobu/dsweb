import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { treasurySchema } from "@/lib/validators";
import { normalizeTreasuryAmount } from "@/lib/services/treasury-service";
import { getServerCurrentUser } from "@/lib/server-current-user";

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
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !["ADMIN", "FOUNDER"].includes(currentUser.role)) {
            return NextResponse.json({ error: "Akses Ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = treasurySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const previous = await prisma.treasury.findUnique({ where: { id } });
        if (!previous) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        const nextAmount = normalizeTreasuryAmount(parsed.data.type, parsed.data.amount);

        const transaction = await prisma.treasury.update({
            where: { id },
            data: {
                amount: nextAmount,
                description: parsed.data.description,
                userId: parsed.data.userId ?? null,
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
            userId: currentUser.id,
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
                    type: parsed.data.type,
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
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !["ADMIN", "FOUNDER"].includes(currentUser.role)) {
            return NextResponse.json({ error: "Akses Ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const deleted = await prisma.treasury.delete({
            where: { id },
        });

        await logAudit({
            userId: currentUser.id,
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
