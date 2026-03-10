import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { activeTeamMembershipSelect, getActiveTeamSnapshot } from "@/lib/team-membership";
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
            memberships: {
                where: { leftAt: null },
                select: {
                    id: true,
                    role: true,
                    joinedAt: true,
                    user: {
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
                        },
                    },
                },
                orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
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
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            city: true,
            avatarUrl: true,
            lastActiveAt: true,
            ...activeTeamMembershipSelect,
        },
        orderBy: [{ role: "desc" }, { fullName: "asc" }],
    });

    const members = team.memberships.map((membership) => ({
        id: membership.user.id,
        membershipId: membership.id,
        fullName: membership.user.fullName,
        email: membership.user.email,
        role: membership.role,
        status: membership.user.status,
        city: membership.user.city,
        avatarUrl: membership.user.avatarUrl,
        createdAt: membership.user.createdAt,
        lastActiveAt: membership.user.lastActiveAt,
        teamJoinedAt: membership.joinedAt,
        communityRole: membership.user.role,
    }));

    const mappedAvailableMembers = availableMembers.map((member) => {
        const activeTeam = getActiveTeamSnapshot(member);
        return {
            ...member,
            teamId: activeTeam.teamId,
            teamJoinedAt: activeTeam.teamJoinedAt,
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            ...team,
            members,
            memberCount: members.length,
            availableMembers: mappedAvailableMembers,
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
            memberships: {
                where: { leftAt: null },
                select: { id: true },
            },
        },
    });

    if (!team) {
        return NextResponse.json({ success: false, message: "Team tidak ditemukan" }, { status: 404 });
    }

    if (team.memberships.length > 0) {
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
