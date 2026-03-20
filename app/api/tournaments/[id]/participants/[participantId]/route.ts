import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { logAudit } from "@/lib/audit-logger";
import { tournamentParticipantUpdateSchema } from "@/lib/validators";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { promoteWaitlistIfSlotAvailable } from "@/lib/services/tournament-waitlist.service";

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
            action: AUDIT_ACTIONS.TOURNAMENT_PARTICIPANT_UPDATED,
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
            if (participant.tournament.status === "ONGOING") {
                await logAudit({
                    userId: currentUser.id,
                    action: AUDIT_ACTIONS.ROSTER_LOCK_BLOCKED,
                    targetId: id,
                    targetType: "Tournament",
                    details: { reason: "ONGOING_TOURNAMENT", action: "PARTICIPANT_REMOVE", participantId },
                });
                return NextResponse.json(
                    { success: false, message: "Roster terkunci karena turnamen sedang berjalan" },
                    { status: 409 }
                );
            }
            return NextResponse.json({ success: false, message: "Peserta hanya bisa dihapus saat turnamen masih OPEN" }, { status: 409 });
        }

        await prisma.tournamentParticipant.delete({ where: { id: participantId } });
        const promotion = await promoteWaitlistIfSlotAvailable(prisma, id, { actorUserId: currentUser.id });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.TOURNAMENT_PARTICIPANT_REMOVED,
            targetId: participantId,
            targetType: "TournamentParticipant",
            details: { tournamentId: id },
        });

        return NextResponse.json({ success: true, promotion });
    } catch (error) {
        console.error("[Tournament Participant Delete]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
