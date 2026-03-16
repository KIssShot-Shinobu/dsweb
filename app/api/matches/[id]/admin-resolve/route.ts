import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";
import { matchAdminResolveSchema } from "@/lib/validators";
import { resolveMatchResult } from "@/lib/services/tournament-bracket.service";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.ADMIN)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = matchAdminResolveSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const match = await prisma.match.findUnique({
            where: { id },
            select: { id: true, playerAId: true, playerBId: true },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        if (![match.playerAId, match.playerBId].includes(parsed.data.winnerId)) {
            return NextResponse.json({ success: false, message: "Winner ID tidak valid untuk match ini" }, { status: 400 });
        }

        await resolveMatchResult(prisma, id, {
            scoreA: parsed.data.scoreA,
            scoreB: parsed.data.scoreB,
            winnerId: parsed.data.winnerId,
            source: "ADMIN",
            confirmedById: currentUser.id,
        });

        await prisma.matchDispute.updateMany({
            where: { matchId: id, status: "OPEN" },
            data: { status: "RESOLVED", resolvedById: currentUser.id, resolvedAt: new Date() },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.MATCH_ADMIN_RESOLVED,
            targetId: id,
            targetType: "Match",
            details: {
                scoreA: parsed.data.scoreA,
                scoreB: parsed.data.scoreB,
                winnerId: parsed.data.winnerId,
                reason: parsed.data.reason || undefined,
            },
        });

        return NextResponse.json({ success: true, message: "Hasil match diset oleh admin" }, { status: 200 });
    } catch (error) {
        console.error("[Match Admin Resolve]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
