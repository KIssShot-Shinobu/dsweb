import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";
import { treasurySchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { createTreasuryEntry } from "@/lib/services/treasury-service";

function buildTreasuryWhere(searchParams: URLSearchParams) {
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;

    if (month && year) {
        const parsedMonth = parseInt(month, 10);
        const parsedYear = parseInt(year, 10);
        if (!isNaN(parsedMonth) && !isNaN(parsedYear)) {
            where.createdAt = {
                gte: new Date(parsedYear, parsedMonth - 1, 1),
                lt: new Date(parsedYear, parsedMonth, 1),
            };
        }
    }

    if (type === "MASUK") {
        where.amount = { gt: 0 };
    } else if (type === "KELUAR") {
        where.amount = { lt: 0 };
    }

    return where;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const where = buildTreasuryWhere(searchParams);
        const summaryWhere = buildTreasuryWhere(new URLSearchParams(searchParams.toString()));
        delete (summaryWhere as { amount?: unknown }).amount;

        const [transactions, total, aggregate, incomeAggregate, expenseAggregate] = await Promise.all([
            prisma.treasury.findMany({
                where,
                include: {
                    user: {
                        select: {
                            fullName: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.treasury.count({ where }),
            prisma.treasury.aggregate({
                where: summaryWhere,
                _sum: {
                    amount: true,
                },
            }),
            prisma.treasury.aggregate({
                where: {
                    ...summaryWhere,
                    amount: { gt: 0 },
                },
                _sum: {
                    amount: true,
                },
            }),
            prisma.treasury.aggregate({
                where: {
                    ...summaryWhere,
                    amount: { lt: 0 },
                },
                _sum: {
                    amount: true,
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            transactions,
            total,
            page,
            limit,
            balance: aggregate._sum.amount || 0,
            income: incomeAggregate._sum.amount || 0,
            expense: Math.abs(expenseAggregate._sum.amount || 0),
        });
    } catch (error) {
        console.error("Error fetching treasury:", error);
        return NextResponse.json({ error: "Failed to fetch treasury" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = await getTokenFromCookie();
        const decoded = token ? await verifyToken(token) : null;
        const userRole = decoded?.role;
        const actorUserId = decoded?.userId;

        if (!userRole || !["ADMIN", "FOUNDER"].includes(userRole)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak" }, { status: 403 });
        }

        const body = await request.json();
        const validBody = treasurySchema.safeParse(body);

        if (!validBody.success) {
            return NextResponse.json({ success: false, message: validBody.error.issues[0].message }, { status: 400 });
        }

        const transaction = await createTreasuryEntry(prisma as any, validBody.data);

        await logAudit({
            userId: actorUserId || "0",
            action: "TREASURY_ADDED",
            targetId: transaction.id,
            targetType: "Treasury",
            details: {
                type: validBody.data.type,
                amount: transaction.amount,
                description: transaction.description,
                userId: transaction.userId,
            },
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }
}
