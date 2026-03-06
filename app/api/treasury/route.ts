import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

// GET /api/treasury - Get all transactions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get("memberId");

        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const month = searchParams.get("month");
        const year = searchParams.get("year");

        const where: any = {};
        if (memberId) where.memberId = memberId;

        // Validasi dan set filter bulan/tahun jika ada
        if (month && year) {
            const m = parseInt(month, 10);
            const y = parseInt(year, 10);
            if (!isNaN(m) && !isNaN(y)) {
                where.createdAt = {
                    gte: new Date(y, m - 1, 1),
                    lt: new Date(y, m, 1),
                };
            }
        }

        const [transactions, total] = await Promise.all([
            prisma.treasury.findMany({
                where,
                include: { member: true },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.treasury.count({ where }),
        ]);

        // Calculate total balance
        const balance = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);

        return NextResponse.json({
            success: true,
            transactions,
            total,
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

import { treasurySchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";

// POST /api/treasury - Create a new transaction
export async function POST(request: NextRequest) {
    try {
        const token = await getTokenFromCookie();
        const decoded = token ? await verifyToken(token) : null;
        const userRole = decoded?.role;
        const userId = decoded?.userId;

        if (!userRole || !["ADMIN", "FOUNDER"].includes(userRole)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak" }, { status: 403 });
        }

        const body = await request.json();
        const validBody = treasurySchema.safeParse(body);

        if (!validBody.success) {
            return NextResponse.json({ success: false, message: validBody.error.issues[0].message }, { status: 400 });
        }

        const { type, amount, description } = validBody.data;

        // Jika type KELUAR, masukkan amount sebagai minus (-)
        const finalAmount = type === "MASUK" ? Math.abs(amount) : -Math.abs(amount);

        const transaction = await prisma.treasury.create({
            data: {
                amount: finalAmount,
                description,
                memberId: body.memberId || null,
            },
            include: {
                member: true,
            },
        });

        // Audit Logging
        await logAudit({
            userId: userId || "0",
            action: "TREASURY_ADDED",
            targetId: transaction.id,
            targetType: "Treasury",
            details: { type, amount: finalAmount, description }
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
