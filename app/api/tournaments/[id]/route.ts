import { NextRequest, NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { tournamentUpdateSchema } from "@/lib/validators";
import { resolveTournamentImage } from "@/lib/tournament-image";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { resolveGameByCodeOrId } from "@/lib/game";
import { parseLocalDateTimeInTimeZone } from "@/lib/datetime";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                game: { select: { code: true, name: true } },
                participants: {
                    include: {
                        user: {
                            select: { id: true, fullName: true, avatarUrl: true, role: true }
                        }
                    },
                    orderBy: { joinedAt: "asc" }
                }
            }
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            tournament: {
                ...tournament,
                gameType: tournament.game?.code ?? "",
                gameName: tournament.game?.name ?? "",
                startAt: tournament.startAt.toISOString(),
                image: resolveTournamentImage(tournament.image),
            },
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = tournamentUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const updateData: Record<string, unknown> = { ...parsed.data };

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, message: "Tidak ada data untuk diupdate" }, { status: 400 });
        }

        let currentTournament: { isTeamTournament: boolean; mode: string; checkinRequired: boolean; timezone: string | null } | null = null;
        const needsCurrentTournament =
            typeof updateData.isTeamTournament === "boolean" ||
            typeof updateData.mode === "string" ||
            updateData.forfeitEnabled === true ||
            updateData.lineupSize !== undefined ||
            typeof updateData.startAt === "string" ||
            typeof updateData.registrationOpen === "string" ||
            typeof updateData.registrationClose === "string" ||
            typeof updateData.timezone === "string";

        if (needsCurrentTournament) {
            currentTournament = await prisma.tournament.findUnique({
                where: { id },
                select: { isTeamTournament: true, mode: true, checkinRequired: true, timezone: true },
            });

            if (!currentTournament) {
                return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
            }
        }

        if (typeof updateData.isTeamTournament === "boolean" || typeof updateData.mode === "string") {
            const nextIsTeam =
                typeof updateData.isTeamTournament === "boolean"
                    ? updateData.isTeamTournament
                    : currentTournament?.isTeamTournament ?? false;
            const nextMode = typeof updateData.mode === "string" ? updateData.mode : currentTournament?.mode ?? "INDIVIDUAL";

            if (nextIsTeam && nextMode === "INDIVIDUAL") {
                return NextResponse.json({ success: false, message: "Mode team wajib dipilih" }, { status: 400 });
            }

            if (!nextIsTeam || nextMode === "INDIVIDUAL") {
                updateData.lineupSize = null;
            }
        }

        if (updateData.lineupSize !== undefined) {
            const nextIsTeam =
                typeof updateData.isTeamTournament === "boolean"
                    ? updateData.isTeamTournament
                    : currentTournament?.isTeamTournament ?? false;
            const nextMode = typeof updateData.mode === "string" ? updateData.mode : currentTournament?.mode ?? "INDIVIDUAL";
            const lineupValue = updateData.lineupSize;

            if (lineupValue !== null && (!nextIsTeam || nextMode === "INDIVIDUAL")) {
                return NextResponse.json({ success: false, message: "Lineup hanya tersedia untuk turnamen team" }, { status: 400 });
            }
        }

        if (updateData.forfeitEnabled === true) {
            if (updateData.checkinRequired === false) {
                return NextResponse.json({ success: false, message: "Auto-forfeit membutuhkan check-in aktif" }, { status: 400 });
            }

            const checkinRequired = updateData.checkinRequired ?? currentTournament?.checkinRequired ?? false;
            if (!checkinRequired) {
                return NextResponse.json({ success: false, message: "Auto-forfeit membutuhkan check-in aktif" }, { status: 400 });
            }
        }

        const timeZone = typeof updateData.timezone === "string" ? updateData.timezone : currentTournament?.timezone ?? DEFAULT_TIMEZONE;
        if (typeof updateData.startAt === "string") {
            const parsedStart = parseLocalDateTimeInTimeZone(updateData.startAt, timeZone);
            if (!parsedStart) {
                return NextResponse.json({ success: false, message: "Tanggal start tidak valid" }, { status: 400 });
            }
            updateData.startAt = parsedStart;
        }

        if (typeof updateData.gameType === "string") {
            const game = await resolveGameByCodeOrId(prisma, updateData.gameType);
            if (!game) {
                return NextResponse.json({ success: false, message: "Game tidak ditemukan" }, { status: 400 });
            }
            updateData.gameId = game.id;
            delete updateData.gameType;
        }

        if (typeof updateData.registrationOpen === "string") {
            const rawOpen = updateData.registrationOpen;
            const parsedOpen = rawOpen ? parseLocalDateTimeInTimeZone(rawOpen, timeZone) : null;
            if (rawOpen && !parsedOpen) {
                return NextResponse.json({ success: false, message: "Tanggal registrasi tidak valid" }, { status: 400 });
            }
            updateData.registrationOpen = parsedOpen;
        }

        if (typeof updateData.registrationClose === "string") {
            const rawClose = updateData.registrationClose;
            const parsedClose = rawClose ? parseLocalDateTimeInTimeZone(rawClose, timeZone) : null;
            if (rawClose && !parsedClose) {
                return NextResponse.json({ success: false, message: "Tanggal registrasi tidak valid" }, { status: 400 });
            }
            updateData.registrationClose = parsedClose;
        }

        if (updateData.description === "") {
            updateData.description = null;
        }

        if (updateData.image === "") {
            updateData.image = null;
        }

        if (typeof updateData.maxPlayers === "number") {
            const participantCount = await prisma.tournamentParticipant.count({
                where: {
                    tournamentId: id,
                    status: { in: ["REGISTERED", "CHECKED_IN", "PLAYING"] },
                },
            });
            if (participantCount > updateData.maxPlayers) {
                return NextResponse.json(
                    { success: false, message: "Max players lebih kecil dari jumlah peserta saat ini." },
                    { status: 400 }
                );
            }
        }

        const tournament = await prisma.tournament.update({
            where: { id },
            data: updateData
        });

        await logAudit({
            userId: currentUser.id,
            action: "TOURNAMENT_UPDATED",
            targetId: tournament.id,
            targetType: "Tournament",
            details: { updatedFields: Object.keys(updateData) }
        });

        return NextResponse.json({ success: true, tournament }, { status: 200 });
    } catch (error) {
        console.error("Error updating tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak" }, { status: 403 });
        }

        const { id } = await params;

        const tournament = await prisma.tournament.delete({
            where: { id }
        });

        await logAudit({
            userId: currentUser.id,
            action: "TOURNAMENT_DELETED",
            targetId: id,
            targetType: "Tournament",
            details: { title: tournament.title }
        });

        return NextResponse.json({ success: true, message: "Turnamen dihapus" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
