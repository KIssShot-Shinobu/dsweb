import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hasRole, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";

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

        return NextResponse.json({ success: true, tournament }, { status: 200 });
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
        const { status } = body;

        if (!status || !["OPEN", "ONGOING", "COMPLETED", "CANCELLED"].includes(status)) {
            return NextResponse.json({ success: false, message: "Status tidak valid" }, { status: 400 });
        }

        const tournament = await prisma.tournament.update({
            where: { id },
            data: { status }
        });

        await logAudit({
            userId: decoded.userId,
            action: "TOURNAMENT_UPDATED",
            targetId: tournament.id,
            targetType: "Tournament",
            details: { newStatus: status }
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
