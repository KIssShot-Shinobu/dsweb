import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hasRole, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { tournamentSchema } from "@/lib/validators";
import { resolveTournamentImage } from "@/lib/tournament-image";

function buildTournamentWhere(searchParams: URLSearchParams) {
    const status = searchParams.get("status");
    const gameType = searchParams.get("gameType");
    const search = searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
        where.status = status;
    }

    if (gameType && gameType !== "ALL") {
        where.gameType = gameType;
    }

    if (search) {
        where.OR = [
            { title: { contains: search } },
            { description: { contains: search } },
        ];
    }

    return where;
}

// GET /api/tournaments - Fetch all tournaments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limitParam = searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam, 10) : undefined;
        const where = buildTournamentWhere(searchParams);

        const [tournaments, total, open, ongoing, completed, cancelled] = await Promise.all([
            prisma.tournament.findMany({
                where,
                orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
                include: {
                    _count: {
                        select: { participants: true },
                    },
                },
                ...(limit ? { skip: (page - 1) * limit, take: limit } : {}),
            }),
            prisma.tournament.count({ where }),
            prisma.tournament.count({ where: { ...where, status: "OPEN" } }),
            prisma.tournament.count({ where: { ...where, status: "ONGOING" } }),
            prisma.tournament.count({ where: { ...where, status: "COMPLETED" } }),
            prisma.tournament.count({ where: { ...where, status: "CANCELLED" } }),
        ]);

        const sanitizedTournaments = tournaments.map((tournament) => ({
            ...tournament,
            image: resolveTournamentImage(tournament.image),
        }));

        return NextResponse.json({
            success: true,
            tournaments: sanitizedTournaments,
            total,
            page,
            limit: limit || null,
            summary: {
                open,
                ongoing,
                completed,
                cancelled,
            },
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching tournaments:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

// POST /api/tournaments - Create a new tournament
export async function POST(request: NextRequest) {
    try {
        // SECURITY: Verify token and role
        const decoded = await verifyToken(request.cookies.get("ds_auth")?.value || "");
        if (!decoded || !hasRole(decoded.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak. Minimal Officer." }, { status: 403 });
        }

        const body = await request.json();
        const validBody = tournamentSchema.safeParse(body);

        if (!validBody.success) {
            return NextResponse.json({ success: false, message: validBody.error.issues[0].message }, { status: 400 });
        }

        const data = validBody.data;

        const tournament = await prisma.tournament.create({
            data: {
                title: data.title,
                description: data.description || null,
                format: data.format,
                gameType: data.gameType,
                status: data.status || "OPEN",
                entryFee: data.entryFee,
                prizePool: data.prizePool,
                startDate: new Date(data.startDate),
                image: data.image || null,
            },
        });

        // AUDIT LOG
        await logAudit({
            userId: decoded.userId,
            action: "TOURNAMENT_CREATED",
            targetId: tournament.id,
            targetType: "Tournament",
            details: { title: tournament.title, gameType: tournament.gameType, format: tournament.format }
        });

        return NextResponse.json({ success: true, tournament }, { status: 201 });
    } catch (error) {
        console.error("Error creating tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
