import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentMatchesQuerySchema } from "@/lib/validators";
import { canRefereeTournament } from "@/lib/tournament-staff";
import { formatLocalDateTime } from "@/lib/datetime";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        if (!hasRole(currentUser.role, ROLES.OFFICER)) {
            const isReferee = await canRefereeTournament(currentUser.id, id);
            if (!isReferee) {
                return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
            }
        }

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
        const includeReports = ["1", "true"].includes((searchParams.get("includeReports") || "").toLowerCase());

        const where = {
            tournamentId: id,
            ...(parsed.data.status && parsed.data.status !== "ALL" ? { status: parsed.data.status } : {}),
            ...(parsed.data.round ? { round: { roundNumber: parsed.data.round } } : {}),
        };

        const include: Prisma.MatchInclude = {
            round: {
                select: { roundNumber: true, type: true },
            },
            playerA: { select: { id: true, guestName: true, user: { select: { id: true, fullName: true, username: true } } } },
            playerB: { select: { id: true, guestName: true, user: { select: { id: true, fullName: true, username: true } } } },
            winner: { select: { id: true, guestName: true, user: { select: { id: true, fullName: true, username: true } } } },
        };

        if (includeReports) {
            include.reports = {
                select: {
                    id: true,
                    reportedById: true,
                    scoreA: true,
                    scoreB: true,
                    winnerId: true,
                    createdAt: true,
                    reportedBy: { select: { id: true, fullName: true, username: true } },
                },
                orderBy: { createdAt: "asc" },
            };
            include.disputes = {
                where: { status: "OPEN" },
                select: {
                    id: true,
                    status: true,
                    reason: true,
                    raisedById: true,
                    createdAt: true,
                    raisedBy: { select: { id: true, fullName: true, username: true } },
                },
                orderBy: { createdAt: "desc" },
            };
        }

        const [matches, total] = await Promise.all([
            prisma.match.findMany({
                where,
                include,
                orderBy: [{ round: { roundNumber: "asc" } }, { bracketIndex: "asc" }],
                skip,
                take: limit,
            }),
            prisma.match.count({ where }),
        ]);

        const normalizedMatches = matches.map((match) => ({
            ...match,
            scheduledAt: match.scheduledAt ? formatLocalDateTime(match.scheduledAt) : null,
        }));

        return NextResponse.json({ success: true, matches: normalizedMatches, total, page, limit });
    } catch (error) {
        console.error("[Tournament Matches]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
