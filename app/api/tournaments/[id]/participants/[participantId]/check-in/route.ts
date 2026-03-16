import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; participantId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id, participantId } = await params;
        const participant = await prisma.tournamentParticipant.findUnique({
            where: { id: participantId },
            select: { id: true, tournamentId: true, checkedInAt: true, status: true },
        });

        if (!participant || participant.tournamentId !== id) {
            return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: { checkinRequired: true },
        });
        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }
        if (!tournament.checkinRequired) {
            return NextResponse.json({ success: false, message: "Check-in tidak diaktifkan untuk turnamen ini." }, { status: 400 });
        }

        const nextCheckedInAt = participant.checkedInAt ? null : new Date();
        const nextStatus = nextCheckedInAt ? "CHECKED_IN" : participant.status === "CHECKED_IN" ? "REGISTERED" : participant.status;

        const updated = await prisma.tournamentParticipant.update({
            where: { id: participantId },
            data: { checkedInAt: nextCheckedInAt, status: nextStatus },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.TOURNAMENT_PARTICIPANT_CHECKIN_TOGGLED,
            targetId: participantId,
            targetType: "TournamentParticipant",
            details: {
                tournamentId: id,
                checkedIn: Boolean(updated.checkedInAt),
            },
        });

        return NextResponse.json({ success: true, participant: updated });
    } catch (error) {
        console.error("[Tournament CheckIn Toggle]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
