import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";
import { treasurySchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const month = searchParams.get("month");
        const year = searchParams.get("year");

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

        const [transactions, total, aggregate] = await Promise.all([
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
                where,
                _sum: {
                    amount: true,
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            transactions,
            total,
            balance: aggregate._sum.amount || 0,
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

        const { type, amount, description } = validBody.data;
        const finalAmount = type === "MASUK" ? Math.abs(amount) : -Math.abs(amount);

        const transaction = await prisma.treasury.create({
            data: {
                amount: finalAmount,
                description,
                userId: body.userId || null,
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
            userId: actorUserId || "0",
            action: "TREASURY_ADDED",
            targetId: transaction.id,
            targetType: "Treasury",
            details: { type, amount: finalAmount, description, userId: transaction.userId },
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }
}
