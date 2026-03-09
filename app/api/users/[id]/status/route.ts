import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { approveSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS, type AuditActionType } from "@/lib/audit-actions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { status, reason, role, teamId } = parsed.data;
    const normalizedReason = reason || undefined;

    const target = await prisma.user.findUnique({
        where: { id },
        select: {
            status: true,
            role: true,
            fullName: true,
            teamId: true,
            teamJoinedAt: true,
            team: { select: { id: true, name: true } },
        },
    });

    if (!target) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (target.role === "FOUNDER" && currentUser.role !== "FOUNDER") {
        return NextResponse.json({ success: false, message: "Tidak bisa memodifikasi Founder" }, { status: 403 });
    }

    const nextRole = role ?? target.role;
    let nextTeamId = typeof teamId !== "undefined" ? teamId : target.teamId;

    if (nextRole === "USER") {
        nextTeamId = null;
    }

    let nextTeam: { id: string; name: string } | null = null;
    if (nextTeamId) {
        const foundTeam = await prisma.team.findUnique({
            where: { id: nextTeamId },
            select: { id: true, name: true, isActive: true },
        });

        if (!foundTeam || !foundTeam.isActive) {
            return NextResponse.json({ success: false, message: "Team tidak ditemukan atau tidak aktif" }, { status: 400 });
        }

        nextTeam = { id: foundTeam.id, name: foundTeam.name };
    }

    const nextTeamJoinedAt = nextTeamId
        ? target.teamId === nextTeamId
            ? target.teamJoinedAt ?? new Date()
            : new Date()
        : null;

    const updated = await prisma.user.update({
        where: { id },
        data: {
            status,
            ...(role ? { role } : {}),
            teamId: nextTeamId,
            teamJoinedAt: nextTeamJoinedAt,
        },
        select: {
            id: true,
            fullName: true,
            status: true,
            role: true,
            teamId: true,
            teamJoinedAt: true,
            team: { select: { id: true, name: true, slug: true } },
        },
    });

    let auditAction: AuditActionType | null = null;
    if (target.status !== status) {
        if (status === "BANNED") auditAction = AUDIT_ACTIONS.USER_BANNED;
        else if (status === "ACTIVE" && target.status === "BANNED") auditAction = AUDIT_ACTIONS.USER_UNBANNED;
        else if (status === "ACTIVE") auditAction = AUDIT_ACTIONS.USER_APPROVED;
    }

    if (auditAction) {
        await logAudit({
            userId: currentUser.id,
            action: auditAction,
            targetId: id,
            targetType: "USER",
            reason: normalizedReason,
            details: {
                oldStatus: target.status,
                newStatus: status,
                newRole: role ?? target.role,
                teamId: nextTeamId,
            },
        });
    }

    if (role && target.role !== role) {
        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.ROLE_CHANGED,
            targetId: id,
            targetType: "USER",
            reason: normalizedReason,
            details: { oldRole: target.role, newRole: role },
        });
    }

    if (target.teamId !== nextTeamId) {
        const teamAction = nextTeamId ? AUDIT_ACTIONS.TEAM_ASSIGNED : AUDIT_ACTIONS.TEAM_UNASSIGNED;
        await logAudit({
            userId: currentUser.id,
            action: teamAction,
            targetId: id,
            targetType: "USER",
            reason: normalizedReason,
            details: {
                oldTeamId: target.teamId,
                oldTeamName: target.team?.name ?? null,
                newTeamId: nextTeamId,
                newTeamName: nextTeam?.name ?? null,
            },
        });
    }

    const messages: Record<string, string> = {
        ACTIVE: `${target.fullName} telah diaktifkan.`,
        BANNED: `${target.fullName} telah diblokir.`,
    };

    const statusMessage =
        status === "ACTIVE" && target.status === "BANNED"
            ? `${target.fullName} telah diaktifkan kembali.`
            : messages[status] ?? "Status diperbarui";

    return NextResponse.json({ success: true, message: statusMessage, data: updated });
}
