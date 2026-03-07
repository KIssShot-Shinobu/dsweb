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

    const { status, reason, role } = parsed.data;

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, fullName: true } });
    if (!target) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    if (target.role === "FOUNDER" && currentUser.role !== "FOUNDER") {
        return NextResponse.json({ success: false, message: "Tidak bisa memodifikasi Founder" }, { status: 403 });
    }

    const updated = await prisma.user.update({
        where: { id },
        data: {
            status,
            ...(role ? { role } : {}),
        },
        select: { id: true, fullName: true, status: true, role: true },
    });

    let auditAction: AuditActionType | null = null;
    if (status === "ACTIVE") auditAction = AUDIT_ACTIONS.USER_APPROVED;
    else if (status === "REJECTED") auditAction = AUDIT_ACTIONS.USER_REJECTED;
    else if (status === "BANNED") auditAction = AUDIT_ACTIONS.USER_BANNED;

    if (auditAction) {
        await logAudit({
            userId: currentUser.id,
            action: auditAction,
            targetId: id,
            targetType: "USER",
            reason: reason || undefined,
            details: { newStatus: status, newRole: role ?? null },
        });
    }

    if (role && target.role !== role) {
        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.ROLE_CHANGED,
            targetId: id,
            targetType: "USER",
            reason: reason || undefined,
            details: { oldRole: target.role, newRole: role },
        });
    }

    const messages: Record<string, string> = {
        ACTIVE: `${target.fullName} telah diaktifkan.`,
        REJECTED: `${target.fullName} telah ditolak.`,
        BANNED: `${target.fullName} telah diblokir.`,
    };

    return NextResponse.json({ success: true, message: messages[status] ?? "Status diperbarui", data: updated });
}
