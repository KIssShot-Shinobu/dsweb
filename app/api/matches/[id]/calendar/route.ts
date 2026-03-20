import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { canAccessMatchChat } from "@/lib/match-chat";
import { buildIcsEvent } from "@/lib/ics";
import { getAppUrl } from "@/lib/runtime-config";

const DEFAULT_DURATION_MINUTES = 60;

const resolveParticipantLabel = (participant?: {
    guestName: string | null;
    user: { fullName: string | null; username: string | null } | null;
}) => participant?.user?.username || participant?.user?.fullName || participant?.guestName || "TBD";

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
                scheduledAt: true,
                tournament: { select: { title: true } },
                playerA: { select: { guestName: true, user: { select: { fullName: true, username: true } }, teamId: true, userId: true } },
                playerB: { select: { guestName: true, user: { select: { fullName: true, username: true } }, teamId: true, userId: true } },
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

        if (!match.scheduledAt) {
            return NextResponse.json({ success: false, message: "Match belum dijadwalkan" }, { status: 400 });
        }

        const start = match.scheduledAt;
        const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
        const labelA = resolveParticipantLabel(match.playerA);
        const labelB = resolveParticipantLabel(match.playerB);
        const appUrl = getAppUrl();

        const ics = buildIcsEvent({
            uid: `match-${match.id}@dsweb`,
            summary: `Match ${labelA} vs ${labelB}`,
            description: `Tournament: ${match.tournament?.title ?? "DuelStandby"}`,
            start,
            end,
            url: `${appUrl}/tournaments/${match.tournamentId}`,
        });

        return new NextResponse(ics, {
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": `attachment; filename=\"match-${match.id}.ics\"`,
            },
        });
    } catch (error) {
        console.error("[Match Calendar]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
