import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentAnnouncementUpdateSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; announcementId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id, announcementId } = await params;
        const body = await request.json();
        const parsed = tournamentAnnouncementUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const announcement = await prisma.tournamentAnnouncement.findUnique({
            where: { id: announcementId },
            select: { id: true, tournamentId: true },
        });

        if (!announcement || announcement.tournamentId !== id) {
            return NextResponse.json({ success: false, message: "Pengumuman tidak ditemukan" }, { status: 404 });
        }

        const updated = await prisma.tournamentAnnouncement.update({
            where: { id: announcementId },
            data: parsed.data,
        });

        return NextResponse.json({ success: true, announcement: updated });
    } catch (error) {
        console.error("[Tournament Announcement Update]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; announcementId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id, announcementId } = await params;
        const announcement = await prisma.tournamentAnnouncement.findUnique({
            where: { id: announcementId },
            select: { id: true, tournamentId: true },
        });

        if (!announcement || announcement.tournamentId !== id) {
            return NextResponse.json({ success: false, message: "Pengumuman tidak ditemukan" }, { status: 404 });
        }

        await prisma.tournamentAnnouncement.delete({ where: { id: announcementId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Tournament Announcement Delete]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
