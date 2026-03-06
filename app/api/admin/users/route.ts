import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "20");

    const where: any = {
        ...(status && status !== "ALL" ? { status } : {}),
        ...(search ? {
            OR: [
                { fullName: { contains: search } },
                { email: { contains: search } },
            ],
        } : {}),
    };

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                phoneWhatsapp: true,
                city: true,
                status: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
                gameProfiles: { select: { gameType: true, ign: true, gameId: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.user.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: users, total, page, perPage });
}
