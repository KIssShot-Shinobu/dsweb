import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentMatchesQuerySchema } from "@/lib/validators";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const parsed = tournamentMatchesQuerySchema.safeParse({
            status: searchParams.get("status") ?? undefined,
            round: searchParams.get("round") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Query tidak valid" }, { status: 400 });
        }

        const page = parsed.data.page ?? 1;
        const limit = parsed.data.limit ?? DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where = {
            tournamentId: id,
            ...(parsed.data.status && parsed.data.status !== "ALL" ? { status: parsed.data.status } : {}),
            ...(parsed.data.round ? { round: { roundNumber: parsed.data.round } } : {}),
        };

        const [matches, total] = await Promise.all([
            prisma.match.findMany({
                where,
                include: {
                    round: {
                        select: { roundNumber: true, type: true },
                    },
                    playerA: { select: { id: true, fullName: true, username: true } },
                    playerB: { select: { id: true, fullName: true, username: true } },
                    winner: { select: { id: true, fullName: true } },
                },
                orderBy: [{ round: { roundNumber: "asc" } }, { bracketIndex: "asc" }],
                skip,
                take: limit,
            }),
            prisma.match.count({ where }),
        ]);

        return NextResponse.json({ success: true, matches, total, page, limit });
    } catch (error) {
        console.error("[Tournament Matches]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
