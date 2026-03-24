import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildTreasuryWhere } from "@/lib/treasury-query";
import { getServerCurrentUser } from "@/lib/server-current-user";

const toCsvValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, "\"\"")}"`;
    }
    return stringValue;
};

const formatCsvDate = (value: Date) => value.toISOString();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const isPublic = searchParams.get("public") === "1";

        if (!isPublic) {
            const currentUser = await getServerCurrentUser();
            if (!currentUser || !["ADMIN", "FOUNDER"].includes(currentUser.role)) {
                return NextResponse.json({ success: false, message: "Akses Ditolak" }, { status: 403 });
            }
        }

        const where = buildTreasuryWhere(searchParams, { ignoreSearch: false });

        const transactions = await prisma.treasury.findMany({
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
        });

        const header = [
            "Date",
            "Type",
            "Amount",
            "Category",
            "Method",
            "Status",
            "Description",
            "Counterparty",
            "Reference",
            "User",
        ];

        const rows = transactions.map((transaction) => {
            const type = transaction.amount >= 0 ? "MASUK" : "KELUAR";
            const amount = Math.abs(transaction.amount);
            const counterparty = isPublic ? "" : transaction.counterparty || "";
            const reference = isPublic ? "" : transaction.referenceCode || "";
            const userLabel = transaction.user?.username || transaction.user?.fullName || "Kas umum";

            return [
                toCsvValue(formatCsvDate(transaction.createdAt)),
                toCsvValue(type),
                toCsvValue(amount),
                toCsvValue(transaction.category),
                toCsvValue(transaction.method),
                toCsvValue(transaction.status),
                toCsvValue(transaction.description),
                toCsvValue(counterparty),
                toCsvValue(reference),
                toCsvValue(userLabel),
            ].join(",");
        });

        const csvContent = [header.join(","), ...rows].join("\n");

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": "attachment; filename=\"treasury-export.csv\"",
            },
        });
    } catch (error) {
        console.error("[Treasury Export]", error);
        return NextResponse.json({ success: false, message: "Gagal mengekspor data." }, { status: 500 });
    }
}
