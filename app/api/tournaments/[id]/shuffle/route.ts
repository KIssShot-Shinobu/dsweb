import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";
import { rebuildTournamentBracket } from "@/lib/services/tournament-bracket.service";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: { id: true, status: true, createdById: true, structure: true, format: true, title: true, maxPlayers: true, bracketSize: true, checkinRequired: true, entryFee: true },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (!hasRole(currentUser.role, ROLES.OFFICER) && currentUser.id !== tournament.createdById) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        if (tournament.status !== "OPEN") {
            return NextResponse.json({ success: false, message: "Shuffle hanya bisa dilakukan saat turnamen masih OPEN" }, { status: 400 });
        }

        const participants = await prisma.tournamentParticipant.findMany({
            where: {
                tournamentId: tournament.id,
                ...(tournament.checkinRequired
                    ? { status: "CHECKED_IN" }
                    : { status: { in: ["REGISTERED", "CHECKED_IN", "PLAYING"] } }),
                ...(tournament.entryFee > 0 ? { paymentStatus: "VERIFIED" } : {}),
            },
            select: { id: true },
        });

        if (participants.length < 2) {
            return NextResponse.json({ success: false, message: "Minimal 2 peserta untuk membuat bracket" }, { status: 400 });
        }

        await rebuildTournamentBracket(
            prisma,
            tournament.id,
            tournament.structure,
            participants.map((participant) => ({ participantId: participant.id })),
            tournament.format,
            tournament.maxPlayers ?? undefined,
            tournament.bracketSize ?? undefined
        );

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.TOURNAMENT_UPDATED,
            targetId: tournament.id,
            targetType: "Tournament",
            details: {
                title: tournament.title,
                action: "BRACKET_SHUFFLED",
            },
        });

        return NextResponse.json({ success: true, message: "Bracket diacak ulang." }, { status: 200 });
    } catch (error) {
        console.error("[Tournament Shuffle]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
