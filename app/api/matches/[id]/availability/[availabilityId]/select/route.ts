import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { canAccessMatchChat } from "@/lib/match-chat";
import { matchAvailabilitySelectSchema } from "@/lib/validators";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { formatDisplayDateTimeInTimeZone } from "@/lib/datetime";
import { resolveMatchNotificationRecipients } from "@/lib/services/match-notification";
import { createNotificationService } from "@/lib/services/notification.service";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { canRefereeTournament } from "@/lib/tournament-staff";
import { hasRole, ROLES } from "@/lib/auth";

const ADMIN_NOTIFY_ROLES = ["OFFICER", "ADMIN", "FOUNDER"] as const;

const normalizeSlots = (slots: unknown) =>
    Array.isArray(slots) ? slots.filter((slot): slot is string => typeof slot === "string") : [];

const resolveParticipantLabel = (participant?: {
    guestName: string | null;
    user: { fullName: string | null; username: string | null } | null;
}) => participant?.user?.username || participant?.user?.fullName || participant?.guestName || "TBD";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; availabilityId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id, availabilityId } = await params;
        const body = await request.json();
        const parsed = matchAvailabilitySelectSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                tournamentId: true,
                scheduledAt: true,
                playerA: { select: { userId: true, teamId: true, guestName: true, user: { select: { fullName: true, username: true } } } },
                playerB: { select: { userId: true, teamId: true, guestName: true, user: { select: { fullName: true, username: true } } } },
                tournament: { select: { timezone: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        if (match.status === "COMPLETED") {
            return NextResponse.json({ success: false, message: "Match sudah selesai" }, { status: 400 });
        }

        const allowed = await canAccessMatchChat(currentUser, {
            tournamentId: match.tournamentId,
            playerA: { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
            playerB: { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
        });
        if (!allowed) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const availability = await prisma.matchAvailability.findUnique({
            where: { id: availabilityId },
            select: {
                id: true,
                matchId: true,
                status: true,
                slots: true,
                proposedById: true,
                expiresAt: true,
            },
        });

        if (!availability || availability.matchId !== id) {
            return NextResponse.json({ success: false, message: "Availability tidak ditemukan" }, { status: 404 });
        }

        if (availability.status !== "PENDING") {
            return NextResponse.json({ success: false, message: "Availability sudah diproses" }, { status: 400 });
        }

        if (availability.expiresAt < new Date()) {
            await prisma.matchAvailability.update({
                where: { id: availability.id },
                data: { status: "EXPIRED" },
            });
            return NextResponse.json({ success: false, message: "Availability sudah kadaluarsa" }, { status: 400 });
        }

        const isAdmin = hasRole(currentUser.role, ROLES.OFFICER);
        const isReferee = !isAdmin && (await canRefereeTournament(currentUser.id, match.tournamentId));
        if (availability.proposedById === currentUser.id && !isAdmin && !isReferee) {
            return NextResponse.json({ success: false, message: "Tidak bisa memilih slot yang Anda ajukan sendiri" }, { status: 403 });
        }

        const slots = normalizeSlots(availability.slots);
        if (!slots.includes(parsed.data.slot)) {
            return NextResponse.json({ success: false, message: "Slot tidak ditemukan" }, { status: 400 });
        }

        const selectedDate = new Date(parsed.data.slot);
        if (Number.isNaN(selectedDate.getTime())) {
            return NextResponse.json({ success: false, message: "Slot tidak valid" }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            await tx.match.update({
                where: { id },
                data: {
                    scheduledAt: selectedDate,
                    reminderSentAt: null,
                    matchVersion: { increment: 1 },
                },
            });

            const availabilityUpdate = await tx.matchAvailability.update({
                where: { id: availability.id },
                data: {
                    status: "SELECTED",
                    selectedSlot: selectedDate,
                    selectedById: currentUser.id,
                },
            });

            await tx.matchAvailability.updateMany({
                where: { matchId: id, status: "PENDING", id: { not: availability.id } },
                data: { status: "CANCELLED" },
            });

            return availabilityUpdate;
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.MATCH_AVAILABILITY_SELECTED,
            targetId: updated.id,
            targetType: "MatchAvailability",
            details: { matchId: id, selectedSlot: selectedDate.toISOString() },
        });

        const recipients = await resolveMatchNotificationRecipients(prisma, match.tournamentId, [
            { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
            { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
        ]);
        const adminUsers = await prisma.user.findMany({
            where: { role: { in: ADMIN_NOTIFY_ROLES }, status: "ACTIVE" },
            select: { id: true },
        });
        const adminIds = adminUsers.map((user) => user.id);
        const filteredRecipients = Array.from(new Set([...recipients, ...adminIds])).filter((userId) => userId !== currentUser.id);

        if (filteredRecipients.length > 0) {
            const notifications = createNotificationService({ prisma });
            const labelA = resolveParticipantLabel(match.playerA);
            const labelB = resolveParticipantLabel(match.playerB);
            const timeZone = match.tournament?.timezone ?? DEFAULT_TIMEZONE;
            const scheduleLabel = formatDisplayDateTimeInTimeZone(selectedDate, timeZone);
            const message = `Match ${labelA} vs ${labelB} dijadwalkan pada ${scheduleLabel}.`;

            try {
                await Promise.all(
                    filteredRecipients.map((userId) =>
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
                console.error("[Match Availability Select Notify]", notifyError);
            }
        }

        return NextResponse.json({ success: true, message: "Slot jadwal dipilih." }, { status: 200 });
    } catch (error) {
        console.error("[Match Availability Select]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
