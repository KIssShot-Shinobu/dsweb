import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { logAudit } from "@/lib/audit-logger";
import { tournamentParticipantUpdateSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; participantId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id, participantId } = await params;
        const body = await request.json();
        const parsed = tournamentParticipantUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const participant = await prisma.tournamentParticipant.findUnique({
            where: { id: participantId },
            select: { id: true, tournamentId: true },
        });

        if (!participant || participant.tournamentId !== id) {
            return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
        }

        const updated = await prisma.tournamentParticipant.update({
            where: { id: participantId },
            data: { gameId: parsed.data.gameId },
        });

        await logAudit({
            userId: currentUser.id,
            action: "TOURNAMENT_PARTICIPANT_UPDATED",
            targetId: participantId,
            targetType: "TournamentParticipant",
            details: { tournamentId: id },
        });

        return NextResponse.json({ success: true, participant: updated });
    } catch (error) {
        console.error("[Tournament Participant Patch]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; participantId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id, participantId } = await params;
        const participant = await prisma.tournamentParticipant.findUnique({
            where: { id: participantId },
            include: { tournament: { select: { status: true } } },
        });

        if (!participant || participant.tournamentId !== id) {
            return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
        }

        if (participant.tournament.status !== "OPEN") {
            return NextResponse.json({ success: false, message: "Peserta hanya bisa dihapus saat turnamen masih OPEN" }, { status: 409 });
        }

        await prisma.tournamentParticipant.delete({ where: { id: participantId } });

        await logAudit({
            userId: currentUser.id,
            action: "TOURNAMENT_PARTICIPANT_REMOVED",
            targetId: participantId,
            targetType: "TournamentParticipant",
            details: { tournamentId: id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Tournament Participant Delete]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
