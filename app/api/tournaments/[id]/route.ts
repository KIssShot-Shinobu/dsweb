import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hasRole, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { tournamentUpdateSchema } from "@/lib/validators";
import { resolveTournamentImage } from "@/lib/tournament-image";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, fullName: true, avatarUrl: true, role: true }
                        }
                    },
                    orderBy: { joinedAt: "asc" }
                }
            }
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            tournament: {
                ...tournament,
                image: resolveTournamentImage(tournament.image),
            },
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const decoded = await verifyToken(request.cookies.get("ds_auth")?.value || "");
        if (!decoded || !hasRole(decoded.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = tournamentUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const updateData: Record<string, unknown> = { ...parsed.data };

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, message: "Tidak ada data untuk diupdate" }, { status: 400 });
        }

        if (typeof updateData.startDate === "string") {
            updateData.startDate = new Date(updateData.startDate);
        }

        if (updateData.description === "") {
            updateData.description = null;
        }

        if (updateData.image === "") {
            updateData.image = null;
        }

        const tournament = await prisma.tournament.update({
            where: { id },
            data: updateData
        });

        await logAudit({
            userId: decoded.userId,
            action: "TOURNAMENT_UPDATED",
            targetId: tournament.id,
            targetType: "Tournament",
            details: { updatedFields: Object.keys(updateData) }
        });

        return NextResponse.json({ success: true, tournament }, { status: 200 });
    } catch (error) {
        console.error("Error updating tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const decoded = await verifyToken(request.cookies.get("ds_auth")?.value || "");
        if (!decoded || !hasRole(decoded.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak" }, { status: 403 });
        }

        const { id } = await params;

        const tournament = await prisma.tournament.delete({
            where: { id }
        });

        await logAudit({
            userId: decoded.userId,
            action: "TOURNAMENT_DELETED",
            targetId: id,
            targetType: "Tournament",
            details: { title: tournament.title }
        });

        return NextResponse.json({ success: true, message: "Turnamen dihapus" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
