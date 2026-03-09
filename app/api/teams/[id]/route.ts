import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { teamSchema } from "@/lib/validators";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "OFFICER")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const team = await prisma.team.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logoUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            members: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                    status: true,
                    city: true,
                    avatarUrl: true,
                    createdAt: true,
                    lastActiveAt: true,
                    teamJoinedAt: true,
                },
                orderBy: [{ role: "desc" }, { fullName: "asc" }],
            },
        },
    });

    if (!team) {
        return NextResponse.json({ success: false, message: "Team tidak ditemukan" }, { status: 404 });
    }

    const availableMembers = await prisma.user.findMany({
        where: {
            deletedAt: null,
            status: "ACTIVE",
            role: { in: ["MEMBER", "OFFICER", "ADMIN", "FOUNDER"] },
            OR: [{ teamId: null }, { teamId: id }],
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            city: true,
            avatarUrl: true,
            teamId: true,
            teamJoinedAt: true,
            lastActiveAt: true,
        },
        orderBy: [{ role: "desc" }, { fullName: "asc" }],
    });

    return NextResponse.json({
        success: true,
        data: {
            ...team,
            memberCount: team.members.length,
            availableMembers,
        },
    });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ success: false, message: "Team tidak ditemukan" }, { status: 404 });
    }

    const slugOwner = await prisma.team.findFirst({
        where: {
            slug: parsed.data.slug,
            NOT: { id },
        },
        select: { id: true },
    });
    if (slugOwner) {
        return NextResponse.json({ success: false, message: "Slug team sudah dipakai" }, { status: 409 });
    }

    const team = await prisma.team.update({
        where: { id },
        data: {
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: parsed.data.description || null,
            logoUrl: parsed.data.logoUrl || null,
            isActive: parsed.data.isActive ?? true,
        },
    });

    await logAudit({
        userId: currentUser.id,
        action: AUDIT_ACTIONS.TEAM_UPDATED,
        targetId: team.id,
        targetType: "TEAM",
        details: {
            oldName: existing.name,
            newName: team.name,
            oldSlug: existing.slug,
            newSlug: team.slug,
            isActive: team.isActive,
        },
    });

    return NextResponse.json({ success: true, data: team });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const team = await prisma.team.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            members: { select: { id: true } },
        },
    });

    if (!team) {
        return NextResponse.json({ success: false, message: "Team tidak ditemukan" }, { status: 404 });
    }

    if (team.members.length > 0) {
        return NextResponse.json({ success: false, message: "Kosongkan roster team sebelum menghapus team" }, { status: 400 });
    }

    await prisma.team.delete({ where: { id } });

    await logAudit({
        userId: currentUser.id,
        action: AUDIT_ACTIONS.TEAM_DELETED,
        targetId: id,
        targetType: "TEAM",
        details: { name: team.name },
    });

    return NextResponse.json({ success: true, message: "Team berhasil dihapus" });
}
