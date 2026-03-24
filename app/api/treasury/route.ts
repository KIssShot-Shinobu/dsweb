import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { treasurySchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { createTreasuryEntry } from "@/lib/services/treasury-service";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { buildMonthlyBuckets, buildTreasuryWhere } from "@/lib/treasury-query";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const includeSummary = searchParams.get("includeSummary") === "1";
        const isPublic = searchParams.get("public") === "1";
        const where = buildTreasuryWhere(searchParams);
        const summaryWhere = buildTreasuryWhere(new URLSearchParams(searchParams.toString()), { ignoreSearch: true });
        delete (summaryWhere as { amount?: unknown }).amount;

        const summaryYearValue = searchParams.get("summaryYear") || searchParams.get("year") || String(new Date().getFullYear());
        const summaryYear = Number.isNaN(Number(summaryYearValue)) ? new Date().getFullYear() : parseInt(summaryYearValue, 10);

        const [transactions, total, aggregate, incomeAggregate, expenseAggregate, summaryTransactions, breakdownTransactions] = await Promise.all([
            prisma.treasury.findMany({
                where,
                include: {
                    user: {
                        select: {
                            fullName: true,
                            username: true,
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
            includeSummary
                ? prisma.treasury.findMany({
                      where: {
                          ...buildTreasuryWhere(new URLSearchParams(searchParams.toString()), { ignoreMonth: true, ignoreSearch: true }),
                          createdAt: {
                              gte: new Date(summaryYear, 0, 1),
                              lt: new Date(summaryYear + 1, 0, 1),
                          },
                      },
                      select: { amount: true, createdAt: true, category: true },
                  })
                : Promise.resolve([]),
            includeSummary
                ? prisma.treasury.findMany({
                      where: summaryWhere,
                      select: { amount: true, category: true },
                  })
                : Promise.resolve([]),
        ]);

        const normalizedTransactions = isPublic
            ? transactions.map((transaction) => ({
                  ...transaction,
                  counterparty: null,
                  referenceCode: null,
              }))
            : transactions;

        const monthlyTotals = includeSummary
            ? (() => {
                  const buckets = buildMonthlyBuckets(summaryYear);
                  summaryTransactions.forEach((transaction) => {
                      const monthIndex = new Date(transaction.createdAt).getMonth();
                      if (transaction.amount >= 0) {
                          buckets[monthIndex].income += transaction.amount;
                      } else {
                          buckets[monthIndex].expense += Math.abs(transaction.amount);
                      }
                  });
                  return buckets;
              })()
            : [];

        const categoryBreakdown = includeSummary
            ? breakdownTransactions.reduce<Record<string, { income: number; expense: number }>>((acc, transaction) => {
                  const key = transaction.category || "OTHER";
                  if (!acc[key]) {
                      acc[key] = { income: 0, expense: 0 };
                  }
                  if (transaction.amount >= 0) {
                      acc[key].income += transaction.amount;
                  } else {
                      acc[key].expense += Math.abs(transaction.amount);
                  }
                  return acc;
              }, {})
            : {};

        return NextResponse.json({
            success: true,
            transactions: normalizedTransactions,
            total,
            page,
            limit,
            balance: aggregate._sum.amount || 0,
            income: incomeAggregate._sum.amount || 0,
            expense: Math.abs(expenseAggregate._sum.amount || 0),
            ...(includeSummary ? { monthlyTotals, categoryBreakdown, summaryYear } : {}),
        });
    } catch (error) {
        console.error("Error fetching treasury:", error);
        return NextResponse.json({ error: "Failed to fetch treasury" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !["ADMIN", "FOUNDER"].includes(currentUser.role)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak" }, { status: 403 });
        }

        const body = await request.json();
        const validBody = treasurySchema.safeParse(body);

        if (!validBody.success) {
            return NextResponse.json({ success: false, message: validBody.error.issues[0].message }, { status: 400 });
        }

        const transaction = await createTreasuryEntry(prisma as any, validBody.data);

        await logAudit({
            userId: currentUser.id,
            action: "TREASURY_ADDED",
            targetId: transaction.id,
            targetType: "Treasury",
            details: {
                type: validBody.data.type,
                amount: transaction.amount,
                description: transaction.description,
                category: transaction.category,
                method: transaction.method,
                status: transaction.status,
                counterparty: transaction.counterparty,
                referenceCode: transaction.referenceCode,
                userId: transaction.userId,
            },
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }
}
