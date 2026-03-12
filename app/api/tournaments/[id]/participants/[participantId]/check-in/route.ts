import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; participantId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id, participantId } = await params;
        const participant = await prisma.tournamentParticipant.findUnique({
            where: { id: participantId },
            select: { id: true, tournamentId: true, checkedInAt: true },
        });

        if (!participant || participant.tournamentId !== id) {
            return NextResponse.json({ success: false, message: "Peserta tidak ditemukan" }, { status: 404 });
        }

        const updated = await prisma.tournamentParticipant.update({
            where: { id: participantId },
            data: { checkedInAt: participant.checkedInAt ? null : new Date() },
        });

        return NextResponse.json({ success: true, participant: updated });
    } catch (error) {
        console.error("[Tournament CheckIn Toggle]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
