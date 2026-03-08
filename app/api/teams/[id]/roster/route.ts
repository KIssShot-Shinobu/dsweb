import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { teamRosterAssignmentSchema } from "@/lib/validators";

async function requireAdminUser() {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return null;
    }

    return currentUser;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const currentUser = await requireAdminUser();
    if (!currentUser) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id: teamId } = await params;
    const body = await req.json();
    const parsed = teamRosterAssignmentSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: "Validasi roster tidak valid", errors: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const [team, user] = await Promise.all([
        prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true, isActive: true } }),
        prisma.user.findUnique({
            where: { id: parsed.data.userId },
            select: { id: true, fullName: true, role: true, status: true, teamId: true },
        }),
    ]);

    if (!team) {
        return NextResponse.json({ success: false, message: "Team tidak ditemukan" }, { status: 404 });
    }

    if (!team.isActive) {
        return NextResponse.json({ success: false, message: "Aktifkan team dulu sebelum menambah roster" }, { status: 400 });
    }

    if (!user) {
        return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
    }

    if (user.status !== "ACTIVE") {
        return NextResponse.json({ success: false, message: "Hanya user aktif yang bisa masuk roster" }, { status: 400 });
    }

    if (!hasRole(user.role, "MEMBER")) {
        return NextResponse.json({ success: false, message: "User publik tidak bisa dimasukkan ke team" }, { status: 400 });
    }

    if (user.teamId && user.teamId !== teamId) {
        return NextResponse.json({ success: false, message: "User ini sudah terhubung ke team lain" }, { status: 409 });
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            teamId,
            teamJoinedAt: user.teamId === teamId ? undefined : new Date(),
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            city: true,
            teamId: true,
            teamJoinedAt: true,
            lastActiveAt: true,
        },
    });

    await logAudit({
        userId: currentUser.id,
        action: AUDIT_ACTIONS.TEAM_ASSIGNED,
        targetId: user.id,
        targetType: "USER",
        details: {
            fullName: user.fullName,
            teamId,
            teamName: team.name,
        },
    });

    return NextResponse.json({
        success: true,
        message: `${user.fullName} berhasil dimasukkan ke ${team.name}.`,
        data: updatedUser,
    });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const currentUser = await requireAdminUser();
    if (!currentUser) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id: teamId } = await params;
    const body = await req.json();
    const parsed = teamRosterAssignmentSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: "Validasi roster tidak valid", errors: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const [team, user] = await Promise.all([
        prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } }),
        prisma.user.findUnique({
            where: { id: parsed.data.userId },
            select: { id: true, fullName: true, teamId: true },
        }),
    ]);

    if (!team) {
        return NextResponse.json({ success: false, message: "Team tidak ditemukan" }, { status: 404 });
    }

    if (!user) {
        return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
    }

    if (user.teamId !== teamId) {
        return NextResponse.json({ success: false, message: "User ini tidak terhubung ke team tersebut" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            teamId: null,
            teamJoinedAt: null,
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            city: true,
            teamId: true,
            teamJoinedAt: true,
            lastActiveAt: true,
        },
    });

    await logAudit({
        userId: currentUser.id,
        action: AUDIT_ACTIONS.TEAM_UNASSIGNED,
        targetId: user.id,
        targetType: "USER",
        details: {
            fullName: user.fullName,
            teamId,
            teamName: team.name,
        },
    });

    return NextResponse.json({
        success: true,
        message: `${user.fullName} berhasil dilepas dari ${team.name}.`,
        data: updatedUser,
    });
}