import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentPaymentDecisionSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { syncOrCreateTournamentBracket } from "@/lib/services/tournament-bracket.service";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; participantId: string }> }
) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id, participantId } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: { id: true, createdById: true, entryFee: true },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (!hasRole(currentUser.role, ROLES.OFFICER) && currentUser.id !== tournament.createdById) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        if (!tournament.entryFee || tournament.entryFee <= 0) {
            return NextResponse.json({ success: false, message: "Turnamen ini tidak membutuhkan verifikasi pembayaran." }, { status: 400 });
        }

        const body = await request.json();
        const parsed = tournamentPaymentDecisionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
        }

        const participant = await prisma.tournamentParticipant.findUnique({
            where: { id: participantId },
            select: { id: true, tournamentId: true, paymentStatus: true, paymentProofUrl: true },
        });

        if (!participant || participant.tournamentId !== tournament.id) {
            return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
        }

        const nextStatus = parsed.data.status;
        if (nextStatus === "VERIFIED" && !participant.paymentProofUrl) {
            return NextResponse.json({ success: false, message: "Bukti pembayaran belum diunggah." }, { status: 400 });
        }

        if (participant.paymentStatus === nextStatus) {
            return NextResponse.json({ success: true, message: "Status pembayaran sudah sama." }, { status: 200 });
        }

        const updated = await prisma.tournamentParticipant.update({
            where: { id: participant.id },
            data: {
                paymentStatus: nextStatus,
                paymentVerifiedAt: nextStatus === "VERIFIED" ? new Date() : null,
            },
        });

        await logAudit({
            userId: currentUser.id,
            action: nextStatus === "VERIFIED" ? AUDIT_ACTIONS.TOURNAMENT_PAYMENT_VERIFIED : AUDIT_ACTIONS.TOURNAMENT_PAYMENT_REJECTED,
            targetId: participant.id,
            targetType: "TournamentParticipant",
            details: { tournamentId: tournament.id, status: nextStatus },
        });

        if (nextStatus === "VERIFIED") {
            await syncOrCreateTournamentBracket(prisma, tournament.id, [participant.id]);
        }

        return NextResponse.json({ success: true, participant: updated, message: "Status pembayaran diperbarui." }, { status: 200 });
    } catch (error) {
        console.error("[Tournament Payment Verify]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
