import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildIcsEvent } from "@/lib/ics";
import { getAppUrl } from "@/lib/runtime-config";

const DEFAULT_DURATION_MINUTES = 120;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                startAt: true,
            },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        const start = tournament.startAt;
        const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
        const appUrl = getAppUrl();

        const ics = buildIcsEvent({
            uid: `tournament-${tournament.id}@dsweb`,
            summary: tournament.title,
            description: "DuelStandby Tournament",
            start,
            end,
            url: `${appUrl}/tournaments/${tournament.id}`,
        });

        return new NextResponse(ics, {
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": `attachment; filename=\"tournament-${tournament.id}.ics\"`,
            },
        });
    } catch (error) {
        console.error("[Tournament Calendar]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
