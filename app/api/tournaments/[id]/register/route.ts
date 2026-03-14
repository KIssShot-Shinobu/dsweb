import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { syncOrCreateTournamentBracket } from "@/lib/services/tournament-bracket.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Silakan login terlebih dahulu" }, { status: 401 });
        }

        if (currentUser.status !== "ACTIVE") {
            return NextResponse.json({ success: false, message: "Hanya akun aktif yang dapat mendaftar turnamen" }, { status: 403 });
        }

        const userId = currentUser.id;
        const { id: tournamentId } = await params;

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (tournament.status !== "OPEN") {
            return NextResponse.json({ success: false, message: "Pendaftaran Turnamen sudah ditutup" }, { status: 400 });
        }

        // Check if already registered
        const existingParticipant = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: { tournamentId, userId }
            }
        });

        if (existingParticipant) {
            return NextResponse.json({ success: false, message: "Anda sudah terdaftar di turnamen ini" }, { status: 400 });
        }

        // Get Game Profile specific to tournament format to snapshot IGN
        const gameProfile = await prisma.gameProfile.findFirst({
            where: {
                userId,
                gameType: tournament.gameType
            }
        });

        if (!gameProfile) {
            const gameLabel = tournament.gameType === "MASTER_DUEL" ? "Master Duel" : "Duel Links";
            return NextResponse.json({ success: false, message: `Harap lengkapi Profil Game ${gameLabel} di Pengaturan Profil Anda terlebih dahulu` }, { status: 400 });
        }

        const participant = await prisma.tournamentParticipant.create({
            data: {
                tournamentId,
                userId,
                gameId: gameProfile.ign // snapshot IGN
            }
        });

        await logAudit({
            userId,
            action: "TOURNAMENT_REGISTERED",
            targetId: tournamentId,
            targetType: "Tournament",
            details: {
                ign: gameProfile.ign,
                gameType: tournament.gameType,
                tournamentTitle: tournament.title,
            },
        });

        await syncOrCreateTournamentBracket(prisma, tournamentId, [participant.id]);

        return NextResponse.json({ success: true, participant, message: "Berhasil mendaftar turnamen!" }, { status: 201 });

    } catch (error) {
        console.error("Error registering to tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
