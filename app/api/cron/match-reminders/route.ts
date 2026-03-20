import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCronSecret } from "@/lib/runtime-config";
import { createNotificationService } from "@/lib/services/notification.service";
import { resolveMatchNotificationRecipients } from "@/lib/services/match-notification";

const REMINDER_WINDOW_MINUTES = 30;

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
        const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

        const matches = await prisma.match.findMany({
            where: {
                scheduledAt: {
                    gte: now,
                    lte: windowEnd,
                },
                reminderSentAt: null,
                status: { in: ["PENDING", "READY", "ONGOING"] },
            },
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
            },
        });

        if (matches.length === 0) {
            return NextResponse.json({ success: true, sentMatches: 0, sentNotifications: 0 });
        }

        const notifications = createNotificationService({ prisma });
        const sentMatchIds: string[] = [];
        let sentNotifications = 0;

        for (const match of matches) {
            if (!match.scheduledAt) continue;
            const recipients = await resolveMatchNotificationRecipients(prisma, match.tournamentId, [
                { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
                { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
            ]);

            if (recipients.length === 0) {
                sentMatchIds.push(match.id);
                continue;
            }

            const labelA = resolveParticipantLabel(match.playerA);
            const labelB = resolveParticipantLabel(match.playerB);
            const scheduleLabel = formatScheduleLabel(match.scheduledAt);
            const message = `Reminder: Match ${labelA} vs ${labelB} akan dimulai pada ${scheduleLabel}.`;

            try {
                await Promise.all(
                    recipients.map((userId) =>
                        notifications.createNotification({
                            userId,
                            type: "SYSTEM_ALERT",
                            title: "Reminder Match",
                            message,
                            link: `/tournaments/${match.tournamentId}`,
                        })
                    )
                );
                sentNotifications += recipients.length;
                sentMatchIds.push(match.id);
            } catch (notifyError) {
                console.error("[Match Reminder Notify]", notifyError);
            }
        }

        if (sentMatchIds.length > 0) {
            await prisma.match.updateMany({
                where: { id: { in: sentMatchIds } },
                data: { reminderSentAt: now },
            });
        }

        return NextResponse.json({ success: true, sentMatches: sentMatchIds.length, sentNotifications });
    } catch (error) {
        console.error("[Match Reminder Cron]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
