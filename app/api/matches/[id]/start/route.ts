import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { canAccessMatchChat } from "@/lib/match-chat";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { resolveMatchNotificationRecipients } from "@/lib/services/match-notification";
import { createNotificationService } from "@/lib/services/notification.service";

const ADMIN_NOTIFY_ROLES = ["OFFICER", "ADMIN", "FOUNDER"] as const;
const BLOCKED_STATUSES = new Set(["RESULT_SUBMITTED", "CONFIRMED", "DISPUTED", "COMPLETED"]);

const resolveParticipantLabel = (participant?: {
    guestName: string | null;
    user: { fullName: string | null; username: string | null } | null;
}) => participant?.user?.username || participant?.user?.fullName || participant?.guestName || "TBD";

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
                status: true,
                tournamentId: true,
                playerA: { select: { userId: true, teamId: true, guestName: true, user: { select: { username: true, fullName: true } } } },
                playerB: { select: { userId: true, teamId: true, guestName: true, user: { select: { username: true, fullName: true } } } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        if (match.status === "ONGOING") {
            return NextResponse.json({ success: true, message: "Match sudah dimulai." }, { status: 200 });
        }

        if (BLOCKED_STATUSES.has(match.status)) {
            return NextResponse.json({ success: false, message: "Match tidak bisa dimulai pada status ini." }, { status: 400 });
        }

        const allowed = await canAccessMatchChat(currentUser, {
            tournamentId: match.tournamentId,
            playerA: { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
            playerB: { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
        });
        if (!allowed) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        await prisma.match.update({
            where: { id },
            data: {
                status: "ONGOING",
                startedAt: new Date(),
                matchVersion: { increment: 1 },
            },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.MATCH_STARTED,
            targetId: id,
            targetType: "Match",
            details: { tournamentId: match.tournamentId },
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
            const message = `Match ${labelA} vs ${labelB} telah dimulai.`;

            try {
                await Promise.all(
                    filteredRecipients.map((userId) =>
                        notifications.createNotification({
                            userId,
                            type: "SYSTEM_ALERT",
                            title: "Match Dimulai",
                            message,
                            link: `/tournaments/${match.tournamentId}`,
                        })
                    )
                );
            } catch (notifyError) {
                console.error("[Match Start Notify]", notifyError);
            }
        }

        return NextResponse.json({ success: true, message: "Match dimulai." }, { status: 200 });
    } catch (error) {
        console.error("[Match Start]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
