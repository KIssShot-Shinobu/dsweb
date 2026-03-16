import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentAnnouncementSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const announcements = await prisma.tournamentAnnouncement.findMany({
            where: { tournamentId: id },
            orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
            include: {
                createdBy: { select: { id: true, fullName: true } },
            },
        });

        return NextResponse.json({ success: true, announcements });
    } catch (error) {
        console.error("[Tournament Announcements]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = tournamentAnnouncementSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const announcement = await prisma.tournamentAnnouncement.create({
            data: {
                tournamentId: id,
                title: parsed.data.title,
                content: parsed.data.content,
                pinned: parsed.data.pinned ?? false,
                createdById: currentUser.id,
            },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.TOURNAMENT_ANNOUNCEMENT_CREATED,
            targetId: announcement.id,
            targetType: "TournamentAnnouncement",
            details: { tournamentId: id, title: announcement.title, pinned: announcement.pinned },
        });

        return NextResponse.json({ success: true, announcement }, { status: 201 });
    } catch (error) {
        console.error("[Tournament Announcement Create]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
