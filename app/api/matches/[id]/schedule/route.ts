import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";
import { matchScheduleSchema } from "@/lib/validators";
import { parseLocalDateTime, formatLocalDateTime } from "@/lib/datetime";
import { createNotificationService } from "@/lib/services/notification.service";
import { resolveMatchNotificationRecipients } from "@/lib/services/match-notification";
import { canRefereeTournament } from "@/lib/tournament-staff";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

const formatScheduleLabel = (value: Date) =>
    new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);

const resolveParticipantLabel = (participant?: {
    guestName: string | null;
    user: { fullName: string | null; username: string | null } | null;
}) => participant?.user?.username || participant?.user?.fullName || participant?.guestName || "TBD";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = matchScheduleSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                tournamentId: true,
                scheduledAt: true,
                playerA: {
                    select: {
                        userId: true,
                        teamId: true,
                        guestName: true,
                        user: { select: { fullName: true, username: true } },
                    },
                },
                playerB: {
                    select: {
                        userId: true,
                        teamId: true,
                        guestName: true,
                        user: { select: { fullName: true, username: true } },
                    },
                },
                tournament: { select: { id: true, title: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        if (!hasRole(currentUser.role, ROLES.OFFICER)) {
            const isReferee = await canRefereeTournament(currentUser.id, match.tournamentId);
            if (!isReferee) {
                return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
            }
        }

        const rawSchedule = parsed.data.scheduledAt;
        const nextScheduledAt = rawSchedule ? parseLocalDateTime(rawSchedule) : null;
        if (rawSchedule && !nextScheduledAt) {
            return NextResponse.json({ success: false, message: "Tanggal jadwal tidak valid" }, { status: 400 });
        }

        const previousTime = match.scheduledAt?.getTime() ?? null;
        const nextTime = nextScheduledAt?.getTime() ?? null;
        if (previousTime === nextTime) {
            return NextResponse.json({ success: true, message: "Jadwal match tidak berubah." }, { status: 200 });
        }

        const updated = await prisma.match.update({
            where: { id },
            data: {
                scheduledAt: nextScheduledAt,
                reminderSentAt: null,
                matchVersion: { increment: 1 },
            },
        });

        const action =
            match.scheduledAt && nextScheduledAt
                ? AUDIT_ACTIONS.MATCH_RESCHEDULED
                : !match.scheduledAt && nextScheduledAt
                  ? AUDIT_ACTIONS.MATCH_SCHEDULED
                  : AUDIT_ACTIONS.MATCH_RESCHEDULED;

        await logAudit({
            userId: currentUser.id,
            action,
            targetId: match.id,
            targetType: "Match",
            details: {
                tournamentId: match.tournamentId,
                scheduledAt: nextScheduledAt ? nextScheduledAt.toISOString() : null,
                previousScheduledAt: match.scheduledAt ? match.scheduledAt.toISOString() : null,
            },
        });

        if (nextScheduledAt) {
            const recipients = await resolveMatchNotificationRecipients(prisma, match.tournamentId, [
                { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
                { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
            ]);

            if (recipients.length > 0) {
                const notifications = createNotificationService({ prisma });
                const labelA = resolveParticipantLabel(match.playerA);
                const labelB = resolveParticipantLabel(match.playerB);
                const scheduleLabel = formatScheduleLabel(nextScheduledAt);
                const message = `Match ${labelA} vs ${labelB} dijadwalkan pada ${scheduleLabel}.`;

                try {
                    await Promise.all(
                        recipients.map((userId) =>
                            notifications.createNotification({
                                userId,
                                type: "MATCH_SCHEDULED",
                                title: "Jadwal Match",
                                message,
                                link: `/tournaments/${match.tournamentId}`,
                            })
                        )
                    );
                } catch (notifyError) {
                    console.error("[Match Schedule Notify]", notifyError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            match: {
                ...updated,
                scheduledAt: nextScheduledAt ? formatLocalDateTime(nextScheduledAt) : null,
            },
        });
    } catch (error) {
        console.error("[Match Schedule]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
