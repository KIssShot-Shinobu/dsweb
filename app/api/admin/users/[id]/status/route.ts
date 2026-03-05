import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { approveSchema } from "@/lib/validators";

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

    // Cannot modify FOUNDER or another ADMIN (unless FOUNDER)
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, fullName: true } });
    if (!target) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    if (target.role === "FOUNDER" && currentUser.role !== "FOUNDER") {
        return NextResponse.json({ success: false, message: "Tidak bisa memodifikasi Founder" }, { status: 403 });
    }

    // Update user status (and optional role)
    const updated = await prisma.user.update({
        where: { id },
        data: {
            status,
            ...(role ? { role } : {}),
        },
        select: { id: true, fullName: true, status: true, role: true },
    });

    // Log admin action
    await prisma.adminLog.create({
        data: {
            adminId: currentUser.id,
            targetId: id,
            action: status === "ACTIVE" ? "APPROVE" : status === "REJECTED" ? "REJECT" : "BAN",
            reason: reason || null,
            details: JSON.stringify({ newStatus: status, newRole: role }),
        },
    });

    const messages: Record<string, string> = {
        ACTIVE: `${target.fullName} telah disetujui sebagai member.`,
        REJECTED: `${target.fullName} telah ditolak.`,
        BANNED: `${target.fullName} telah dibanned.`,
    };

    return NextResponse.json({ success: true, message: messages[status] ?? "Status diperbarui", data: updated });
}
