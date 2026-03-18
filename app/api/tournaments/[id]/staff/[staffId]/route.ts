import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; staffId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id, staffId } = await params;
        const staff = await prisma.tournamentStaff.findUnique({
            where: { id: staffId },
            select: { id: true, tournamentId: true, userId: true, role: true },
        });

        if (!staff || staff.tournamentId !== id) {
            return NextResponse.json({ success: false, message: "Staff tidak ditemukan" }, { status: 404 });
        }

        await prisma.tournamentStaff.delete({ where: { id: staffId } });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.REFEREE_REMOVED,
            targetId: staffId,
            targetType: "TournamentStaff",
            details: {
                tournamentId: id,
                staffUserId: staff.userId,
                staffRole: staff.role,
            },
        });

        return NextResponse.json({ success: true, message: "Staff dihapus" }, { status: 200 });
    } catch (error) {
        console.error("[Tournament Staff Delete]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

