import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;

        const [tournament, registeredPlayers, checkedInPlayers, matchesPlayed, matchesRemaining] = await Promise.all([
            prisma.tournament.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    game: { select: { code: true, name: true } },
                    status: true,
                    startAt: true,
                    format: true,
                    structure: true,
                    checkinRequired: true,
                    checkInOpen: true,
                    checkInAt: true,
                },
            }),
            prisma.tournamentParticipant.count({ where: { tournamentId: id } }),
            prisma.tournamentParticipant.count({ where: { tournamentId: id, checkedInAt: { not: null } } }),
            prisma.match.count({ where: { tournamentId: id, status: "COMPLETED" } }),
            prisma.match.count({ where: { tournamentId: id, status: { not: "COMPLETED" } } }),
        ]);

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        const tournamentPayload = {
            ...tournament,
            gameType: tournament.game?.code ?? "",
            gameName: tournament.game?.name ?? "",
            startAt: tournament.startAt.toISOString(),
        };

        return NextResponse.json({
            success: true,
            tournament: tournamentPayload,
            stats: {
                registeredPlayers,
                checkedInPlayers,
                matchesPlayed,
                matchesRemaining,
            },
        });
    } catch (error) {
        console.error("[Tournament Summary]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
