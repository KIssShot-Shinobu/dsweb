import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { buildAuditLogWhere } from "@/lib/audit-query";

export async function GET(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        // Hanya role ADMIN dan FOUNDER
        if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
        const where = buildAuditLogWhere(searchParams);

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: { select: { fullName: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * perPage,
                take: perPage,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: logs,
            total,
            page,
            perPage,
        });
    } catch (error) {
        console.error("[Audit Logs API Error]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
