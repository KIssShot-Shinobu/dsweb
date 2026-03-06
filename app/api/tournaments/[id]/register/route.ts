import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hasRole, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const decoded = await verifyToken(request.cookies.get("ds_auth")?.value || "");
        if (!decoded || !hasRole(decoded.role, ROLES.MEMBER)) {
            return NextResponse.json({ success: false, message: "Hanya Member yang telah disetujui yang dapat mendaftar" }, { status: 403 });
        }

        const userId = decoded.userId;
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
            return NextResponse.json({ success: false, message: `Harap lengkapi Profil Game ${tournament.gameType} di Pengaturan Profil Anda terlebih dahulu` }, { status: 400 });
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
            action: "TOURNAMENT_UPDATED",
            targetId: tournamentId,
            targetType: "Tournament",
            details: { action: "User Registered", ign: gameProfile.ign }
        });

        return NextResponse.json({ success: true, participant, message: "Berhasil mendaftar turnamen!" }, { status: 201 });

    } catch (error) {
        console.error("Error registering to tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
