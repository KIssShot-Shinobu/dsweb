import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCronSecret } from "@/lib/runtime-config";
import { resolveMatchResult } from "@/lib/services/tournament-bracket.service";
import { createNotificationService } from "@/lib/services/notification.service";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { getAutoConfirmCandidates } from "@/lib/services/match-auto-confirm";

const AUTO_CONFIRM_HOURS = 24;

export async function POST(request: Request) {
    try {
        const secret = getCronSecret();
        if (!secret) {
            return NextResponse.json({ success: false, message: "Cron secret belum dikonfigurasi" }, { status: 500 });
        }

        const provided = request.headers.get("x-cron-secret");
        if (provided !== secret) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const cutoff = new Date(now.getTime() - AUTO_CONFIRM_HOURS * 60 * 60 * 1000);

        const matches = await prisma.match.findMany({
            where: {
                status: "RESULT_SUBMITTED",
                disputes: { none: { status: "OPEN" } },
            },
            select: {
                id: true,
                tournamentId: true,
                reports: {
                    select: { reportedById: true, scoreA: true, scoreB: true, winnerId: true, createdAt: true },
                },
                playerA: { select: { userId: true, guestName: true, user: { select: { fullName: true, username: true } } } },
                playerB: { select: { userId: true, guestName: true, user: { select: { fullName: true, username: true } } } },
            },
        });

        const candidates = getAutoConfirmCandidates(matches, cutoff);
        if (candidates.length === 0) {
            return NextResponse.json({ success: true, confirmed: 0, notified: 0 });
        }

        const notifications = createNotificationService({ prisma });
        let confirmed = 0;
        let notified = 0;

        for (const match of candidates) {
            const report = match.reports[0];
            if (!report) continue;

            await resolveMatchResult(prisma, match.id, {
                scoreA: report.scoreA,
                scoreB: report.scoreB,
                winnerId: report.winnerId,
                source: "SYSTEM",
            });

            await logAudit({
                userId: null,
                action: AUDIT_ACTIONS.MATCH_CONFIRMED_AUTO,
                targetId: match.id,
                targetType: "Match",
                details: {
                    scoreA: report.scoreA,
                    scoreB: report.scoreB,
                    winnerId: report.winnerId,
                    cutoff: cutoff.toISOString(),
                },
            });

            const recipients = [match.playerA?.userId, match.playerB?.userId].filter(Boolean) as string[];
            if (recipients.length > 0) {
                const message = "Hasil match otomatis dikonfirmasi karena lawan tidak merespons dalam 24 jam.";
                try {
                    await Promise.all(
                        recipients.map((userId) =>
                            notifications.createNotification({
                                userId,
                                type: "MATCH_RESULT",
                                title: "Hasil Match Dikonfirmasi Otomatis",
                                message,
                                link: `/tournaments/${match.tournamentId}`,
                            })
                        )
                    );
                    notified += recipients.length;
                } catch (notifyError) {
                    console.error("[Match Auto Confirm Notify]", notifyError);
                }
            }

            confirmed += 1;
        }

        return NextResponse.json({ success: true, confirmed, notified });
    } catch (error) {
        console.error("[Match Auto Confirm Cron]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
