import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";
import { generateTournamentBracket } from "@/lib/services/tournament-bracket.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: { id: true, status: true, structure: true },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (tournament.status !== "OPEN") {
            return NextResponse.json({ success: false, message: "Turnamen sudah dimulai atau selesai" }, { status: 400 });
        }

        const existingRounds = await prisma.tournamentRound.count({
            where: { tournamentId: tournament.id },
        });

        if (existingRounds === 0) {
            const participants = await prisma.tournamentParticipant.findMany({
                where: { tournamentId: tournament.id },
                select: { id: true },
            });

            if (participants.length < 2) {
                return NextResponse.json({ success: false, message: "Minimal 2 peserta untuk memulai turnamen" }, { status: 400 });
            }

            await generateTournamentBracket(
                prisma,
                tournament.id,
                tournament.structure,
                participants.map((participant) => ({ participantId: participant.id }))
            );
        }

        await prisma.tournament.update({
            where: { id: tournament.id },
            data: { status: "ONGOING" },
        });

        return NextResponse.json({ success: true, message: "Turnamen dimulai." }, { status: 201 });
    } catch (error) {
        console.error("[Tournament Start]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
