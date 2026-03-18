import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";
import { matchDisputeResolveSchema } from "@/lib/validators";
import { resolveMatchResult } from "@/lib/services/tournament-bracket.service";
import { canRefereeTournament } from "@/lib/tournament-staff";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { createNotificationService } from "@/lib/services/notification.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = matchDisputeResolveSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                tournamentId: true,
                status: true,
                playerAId: true,
                playerBId: true,
                playerA: { select: { userId: true } },
                playerB: { select: { userId: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        const canResolve = hasRole(currentUser.role, ROLES.OFFICER) || await canRefereeTournament(currentUser.id, match.tournamentId);
        if (!canResolve) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        if (match.status !== "DISPUTED") {
            return NextResponse.json({ success: false, message: "Match tidak dalam status sengketa" }, { status: 400 });
        }

        if (![match.playerAId, match.playerBId].includes(parsed.data.winnerId)) {
            return NextResponse.json({ success: false, message: "Winner ID tidak valid untuk match ini" }, { status: 400 });
        }

        const reportMatch = await prisma.matchReport.findFirst({
            where: {
                matchId: id,
                scoreA: parsed.data.scoreA,
                scoreB: parsed.data.scoreB,
                winnerId: parsed.data.winnerId,
            },
            select: { id: true },
        });

        if (!reportMatch) {
            return NextResponse.json({ success: false, message: "Skor tidak sesuai laporan peserta" }, { status: 400 });
        }

        await resolveMatchResult(prisma, id, {
            scoreA: parsed.data.scoreA,
            scoreB: parsed.data.scoreB,
            winnerId: parsed.data.winnerId,
            source: "ADMIN",
            confirmedById: currentUser.id,
        });

        await prisma.matchDispute.updateMany({
            where: { matchId: id, status: "OPEN" },
            data: { status: "RESOLVED", resolvedById: currentUser.id, resolvedAt: new Date() },
        });

        const notifications = createNotificationService({ prisma });
        const participantUserIds = [match.playerA?.userId, match.playerB?.userId].filter(Boolean) as string[];
        await Promise.all(
            participantUserIds.map((userId) =>
                notifications.createNotification({
                    userId,
                    type: "MATCH_RESULT",
                    title: "Sengketa Match Diselesaikan",
                    message: "Referee telah menyelesaikan sengketa pertandingan. Cek hasil terbaru di halaman turnamen.",
                    link: `/tournaments/${match.tournamentId}`,
                })
            )
        );

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.MATCH_DISPUTE_RESOLVED,
            targetId: id,
            targetType: "Match",
            details: {
                scoreA: parsed.data.scoreA,
                scoreB: parsed.data.scoreB,
                winnerId: parsed.data.winnerId,
                reason: parsed.data.reason || undefined,
            },
        });

        return NextResponse.json({ success: true, message: "Sengketa terselesaikan" }, { status: 200 });
    } catch (error) {
        console.error("[Match Dispute Resolve]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
