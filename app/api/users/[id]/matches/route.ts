import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (currentUser.id !== id && !hasRole(currentUser.role, ROLES.ADMIN)) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, Number(searchParams.get("page") || 1));
        const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));

        const where = {
            OR: [{ playerAId: id }, { playerBId: id }],
        };

        const [matches, total] = await Promise.all([
            prisma.match.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    status: true,
                    scoreA: true,
                    scoreB: true,
                    winnerId: true,
                    playerAId: true,
                    playerBId: true,
                    tournament: { select: { id: true, title: true, gameType: true } },
                    round: { select: { id: true, roundNumber: true, type: true } },
                },
            }),
            prisma.match.count({ where }),
        ]);

        return NextResponse.json({ success: true, data: matches, total, page, limit }, { status: 200 });
    } catch (error) {
        console.error("[User Matches]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
