import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentCheckInActionSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = tournamentCheckInActionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const updateData: { checkInOpen?: boolean; checkInAt?: Date | null } = {};
        if (parsed.data.action) {
            updateData.checkInOpen = parsed.data.action === "OPEN";
        }
        if (parsed.data.checkInAt !== undefined) {
            updateData.checkInAt = parsed.data.checkInAt ? new Date(parsed.data.checkInAt) : null;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, message: "Tidak ada perubahan check-in." }, { status: 400 });
        }

        const checkinGuard = await prisma.tournament.findUnique({
            where: { id },
            select: { checkinRequired: true },
        });
        if (!checkinGuard) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }
        if (!checkinGuard.checkinRequired) {
            return NextResponse.json({ success: false, message: "Check-in tidak diaktifkan untuk turnamen ini." }, { status: 400 });
        }

        const tournament = await prisma.tournament.update({
            where: { id },
            data: updateData,
            select: { id: true, checkInOpen: true, checkInAt: true },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.TOURNAMENT_CHECKIN_UPDATED,
            targetId: id,
            targetType: "Tournament",
            details: {
                checkInOpen: tournament.checkInOpen,
                checkInAt: tournament.checkInAt ? tournament.checkInAt.toISOString() : null,
            },
        });

        return NextResponse.json({ success: true, tournament });
    } catch (error) {
        console.error("[Tournament CheckIn]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
