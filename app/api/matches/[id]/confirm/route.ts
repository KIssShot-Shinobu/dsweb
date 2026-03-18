import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { resolveMatchResult } from "@/lib/services/tournament-bracket.service";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { canRefereeTournament } from "@/lib/tournament-staff";
import { createNotificationService } from "@/lib/services/notification.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
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

        const participantUserIds = [match.playerA?.userId, match.playerB?.userId].filter(Boolean);
        const isParticipant = participantUserIds.includes(currentUser.id);
        const isReferee = !isParticipant && await canRefereeTournament(currentUser.id, match.tournamentId);
        if (!isParticipant && !isReferee) {
            return NextResponse.json({ success: false, message: "Anda tidak punya akses ke match ini" }, { status: 403 });
        }

        const existingReports = await prisma.matchReport.findMany({
            where: { matchId: id },
            select: { reportedById: true, scoreA: true, scoreB: true, winnerId: true },
        });

        if (existingReports.length === 0) {
            return NextResponse.json({ success: false, message: "Belum ada laporan untuk dikonfirmasi" }, { status: 400 });
        }

        if (existingReports.some((report) => report.reportedById === currentUser.id)) {
            return NextResponse.json({ success: false, message: "Anda sudah mengirim laporan" }, { status: 400 });
        }

        const report = existingReports[0];
        if (isReferee) {
            if (match.status === "DISPUTED") {
                return NextResponse.json({ success: false, message: "Match sedang sengketa. Gunakan resolve dispute." }, { status: 400 });
            }
        } else {
            await prisma.matchReport.create({
                data: {
                    matchId: id,
                    reportedById: currentUser.id,
                    scoreA: report.scoreA,
                    scoreB: report.scoreB,
                    winnerId: report.winnerId,
                },
            });
        }

        await resolveMatchResult(prisma, id, {
            scoreA: report.scoreA,
            scoreB: report.scoreB,
            winnerId: report.winnerId,
            source: isReferee ? "ADMIN" : "PLAYER",
            confirmedById: currentUser.id,
        });

        if (isReferee) {
            const notifications = createNotificationService({ prisma });
            const participantUserIds = [match.playerA?.userId, match.playerB?.userId].filter(Boolean) as string[];
            await Promise.all(
                participantUserIds.map((userId) =>
                    notifications.createNotification({
                        userId,
                        type: "MATCH_RESULT",
                        title: "Hasil Match Dikonfirmasi Referee",
                        message: "Referee telah mengonfirmasi hasil pertandingan. Cek hasil terbaru di halaman turnamen.",
                        link: `/tournaments/${match.tournamentId}`,
                    })
                )
            );
        }

        await logAudit({
            userId: currentUser.id,
            action: isReferee ? AUDIT_ACTIONS.MATCH_CONFIRMED_BY_REFEREE : AUDIT_ACTIONS.MATCH_CONFIRMED,
            targetId: id,
            targetType: "Match",
            details: { scoreA: report.scoreA, scoreB: report.scoreB, winnerId: report.winnerId },
        });

        return NextResponse.json({ success: true, message: "Hasil match terkonfirmasi" }, { status: 200 });
    } catch (error) {
        console.error("[Match Confirm]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
