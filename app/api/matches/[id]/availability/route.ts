import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { canAccessMatchChat } from "@/lib/match-chat";
import { matchAvailabilitySchema } from "@/lib/validators";
import { parseLocalDateTimeInTimeZone, formatDisplayDateTimeInTimeZone } from "@/lib/datetime";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { createNotificationService } from "@/lib/services/notification.service";
import { resolveMatchNotificationRecipients } from "@/lib/services/match-notification";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

const EXPIRY_HOURS = 48;
const ADMIN_NOTIFY_ROLES = ["OFFICER", "ADMIN", "FOUNDER"] as const;

const resolveParticipantLabel = (participant?: {
    guestName: string | null;
    user: { fullName: string | null; username: string | null } | null;
}) => participant?.user?.username || participant?.user?.fullName || participant?.guestName || "TBD";

const normalizeSlots = (slots: unknown) =>
    Array.isArray(slots) ? slots.filter((slot): slot is string => typeof slot === "string") : [];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
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
                playerA: { select: { userId: true, teamId: true } },
                playerB: { select: { userId: true, teamId: true } },
                tournament: { select: { timezone: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        const allowed = await canAccessMatchChat(currentUser, {
            tournamentId: match.tournamentId,
            playerA: { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
            playerB: { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
        });
        if (!allowed) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const now = new Date();
        await prisma.matchAvailability.updateMany({
            where: { matchId: id, status: "PENDING", expiresAt: { lt: now } },
            data: { status: "EXPIRED" },
        });

        const availabilities = await prisma.matchAvailability.findMany({
            where: { matchId: id, status: { in: ["PENDING", "SELECTED"] } },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                status: true,
                slots: true,
                selectedSlot: true,
                expiresAt: true,
                createdAt: true,
                proposedBy: { select: { id: true, username: true, fullName: true } },
                selectedBy: { select: { id: true, username: true, fullName: true } },
            },
        });

        const timeZone = match.tournament?.timezone ?? DEFAULT_TIMEZONE;
        const mapped = availabilities.map((availability) => {
            const slots = normalizeSlots(availability.slots).map((slot) => {
                const date = new Date(slot);
                const label = Number.isNaN(date.getTime()) ? slot : formatDisplayDateTimeInTimeZone(date, timeZone);
                return { value: slot, label };
            });

            return {
                ...availability,
                slots,
                tournamentTimezone: timeZone,
            };
        });

        return NextResponse.json({ success: true, availabilities: mapped, tournamentTimezone: timeZone });
    } catch (error) {
        console.error("[Match Availability]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = matchAvailabilitySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                tournamentId: true,
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

        const timeZone = match.tournament?.timezone ?? DEFAULT_TIMEZONE;
        const slotDates = parsed.data.slots
            .map((slot) => parseLocalDateTimeInTimeZone(slot, timeZone))
            .filter((slot): slot is Date => Boolean(slot));

        if (slotDates.length === 0) {
            return NextResponse.json({ success: false, message: "Slot tidak valid" }, { status: 400 });
        }

        const uniqueSlots = Array.from(new Set(slotDates.map((slot) => slot.toISOString())));
        const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

        const availability = await prisma.matchAvailability.create({
            data: {
                matchId: id,
                proposedById: currentUser.id,
                slots: uniqueSlots,
                expiresAt,
            },
            select: { id: true },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.MATCH_AVAILABILITY_PROPOSED,
            targetId: availability.id,
            targetType: "MatchAvailability",
            details: { matchId: id, slots: uniqueSlots },
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
            const message = `Slot jadwal baru untuk match ${labelA} vs ${labelB}. Silakan pilih salah satu slot.`;

            try {
                await Promise.all(
                    filteredRecipients.map((userId) =>
                        notifications.createNotification({
                            userId,
                            type: "SYSTEM_ALERT",
                            title: "Usulan Jadwal Match",
                            message,
                            link: `/tournaments/${match.tournamentId}`,
                        })
                    )
                );
            } catch (notifyError) {
                console.error("[Match Availability Notify]", notifyError);
            }
        }

        return NextResponse.json({ success: true, message: "Slot jadwal berhasil dikirim." }, { status: 201 });
    } catch (error) {
        console.error("[Match Availability POST]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
