import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { matchDisputeSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = matchDisputeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                playerAId: true,
                playerBId: true,
                status: true,
                playerA: { select: { userId: true } },
                playerB: { select: { userId: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        const participantUserIds = [match.playerA?.userId, match.playerB?.userId].filter(Boolean);
        if (!participantUserIds.includes(currentUser.id)) {
            return NextResponse.json({ success: false, message: "Anda bukan pemain di match ini" }, { status: 403 });
        }

        await prisma.matchDispute.create({
            data: {
                matchId: id,
                raisedById: currentUser.id,
                status: "OPEN",
                reason: parsed.data.reason || null,
            },
        });

        await prisma.match.update({
            where: { id },
            data: { status: "DISPUTED", matchVersion: { increment: 1 } },
        });

        return NextResponse.json({ success: true, message: "Sengketa dibuat, menunggu admin" }, { status: 201 });
    } catch (error) {
        console.error("[Match Dispute]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
