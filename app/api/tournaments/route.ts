import { NextRequest, NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { tournamentSchema } from "@/lib/validators";
import { resolveTournamentImage } from "@/lib/tournament-image";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { resolveGameByCodeOrId } from "@/lib/game";
import { parseLocalDateTimeInTimeZone } from "@/lib/datetime";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";

function buildTournamentWhere(searchParams: URLSearchParams) {
    const status = searchParams.get("status");
    const gameType = searchParams.get("gameType");
    const search = searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
        where.status = status;
    }

    if (gameType && gameType !== "ALL") {
        where.game = { code: gameType };
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
                orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
                include: {
                    game: { select: { code: true, name: true } },
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

        const tournamentIds = tournaments.map((tournament) => tournament.id);
        const activeCounts = tournamentIds.length
            ? await prisma.tournamentParticipant.groupBy({
                  by: ["tournamentId"],
                  where: {
                      tournamentId: { in: tournamentIds },
                      status: { in: ["REGISTERED", "CHECKED_IN", "PLAYING"] },
                  },
                  _count: { _all: true },
              })
            : [];
        const activeCountMap = new Map(activeCounts.map((entry) => [entry.tournamentId, entry._count._all]));

        const sanitizedTournaments = tournaments.map((tournament) => ({
            ...tournament,
            _count: {
                participants: activeCountMap.get(tournament.id) ?? 0,
            },
            gameType: tournament.game?.code ?? "",
            gameName: tournament.game?.name ?? "",
            startAt: tournament.startAt.toISOString(),
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
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak. Minimal Officer." }, { status: 403 });
        }

        const body = await request.json();
        const validBody = tournamentSchema.safeParse(body);

        if (!validBody.success) {
            return NextResponse.json({ success: false, message: validBody.error.issues[0].message }, { status: 400 });
        }

        const data = validBody.data;
        const game = await resolveGameByCodeOrId(prisma, data.gameType);
        if (!game) {
            return NextResponse.json({ success: false, message: "Game tidak ditemukan" }, { status: 400 });
        }
        const timeZone = data.timezone ?? DEFAULT_TIMEZONE;
        const registrationOpen = data.registrationOpen ? parseLocalDateTimeInTimeZone(data.registrationOpen, timeZone) : null;
        const registrationClose = data.registrationClose ? parseLocalDateTimeInTimeZone(data.registrationClose, timeZone) : null;
        if (data.registrationOpen && !registrationOpen) {
            return NextResponse.json({ success: false, message: "Tanggal registrasi tidak valid" }, { status: 400 });
        }
        if (data.registrationClose && !registrationClose) {
            return NextResponse.json({ success: false, message: "Tanggal registrasi tidak valid" }, { status: 400 });
        }

        const startAt = parseLocalDateTimeInTimeZone(data.startAt, timeZone);
        if (!startAt) {
            return NextResponse.json({ success: false, message: "Tanggal start tidak valid" }, { status: 400 });
        }
        const mode = data.mode || "INDIVIDUAL";
        const isTeamTournament =
            typeof data.isTeamTournament === "boolean"
                ? data.isTeamTournament
                : data.mode
                  ? data.mode !== "INDIVIDUAL"
                  : false;
        const lineupSize = isTeamTournament ? (data.lineupSize ?? null) : null;

        const tournament = await prisma.tournament.create({
            data: {
                title: data.title,
                description: data.description || null,
                format: data.format,
                gameId: game.id,
                status: data.status || "OPEN",
                structure: data.structure || "SINGLE_ELIM",
                mode,
                isTeamTournament,
                timezone: timeZone,
                entryFee: data.entryFee,
                prizePool: data.prizePool,
                maxPlayers: data.maxPlayers ?? null,
                minPlayers: data.minPlayers ?? null,
                bracketSize: data.bracketSize ?? null,
                lineupSize,
                checkinRequired: data.checkinRequired ?? false,
                forfeitEnabled: data.forfeitEnabled ?? false,
                forfeitGraceMinutes: data.forfeitGraceMinutes ?? 15,
                forfeitMode: data.forfeitMode ?? "CHECKIN_ONLY",
                registrationOpen,
                registrationClose,
                startAt,
                image: data.image || null,
                createdById: currentUser.id,
            },
        });

        // AUDIT LOG
        await logAudit({
            userId: currentUser.id,
            action: "TOURNAMENT_CREATED",
            targetId: tournament.id,
            targetType: "Tournament",
            details: { title: tournament.title, gameCode: game.code, format: tournament.format }
        });

        return NextResponse.json({ success: true, tournament }, { status: 201 });
    } catch (error) {
        console.error("Error creating tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
