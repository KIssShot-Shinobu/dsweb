import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { approveSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS, type AuditActionType } from "@/lib/audit-actions";
import { activeTeamMembershipSelect, getActiveTeamSnapshot } from "@/lib/team-membership";

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

    const { status, reason, role } = parsed.data;
    const normalizedReason = reason || undefined;

    const target = await prisma.user.findUnique({
        where: { id },
        select: {
            status: true,
            role: true,
            fullName: true,
            ...activeTeamMembershipSelect,
        },
    });

    if (!target) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (target.role === "FOUNDER" && currentUser.role !== "FOUNDER") {
        return NextResponse.json({ success: false, message: "Tidak bisa memodifikasi Founder" }, { status: 403 });
    }

    const updated = await prisma.user.update({
        where: { id },
        data: {
            status,
            ...(role ? { role } : {}),
        },
        select: {
            id: true,
            fullName: true,
            status: true,
            role: true,
            ...activeTeamMembershipSelect,
        },
    });

    const updatedTeam = getActiveTeamSnapshot(updated);

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

    const messages: Record<string, string> = {
        ACTIVE: `${target.fullName} telah diaktifkan.`,
        BANNED: `${target.fullName} telah diblokir.`,
    };

    const statusMessage =
        status === "ACTIVE" && target.status === "BANNED"
            ? `${target.fullName} telah diaktifkan kembali.`
            : messages[status] ?? "Status diperbarui";

    return NextResponse.json({
        success: true,
        message: statusMessage,
        data: {
            ...updated,
            teamId: updatedTeam.teamId,
            teamJoinedAt: updatedTeam.teamJoinedAt,
            team: updatedTeam.team,
        },
    });
}
