import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";
import { tournamentStaffAssignSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const staff = await prisma.tournamentStaff.findMany({
            where: { tournamentId: id },
            select: {
                id: true,
                role: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        avatarUrl: true,
                        role: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, staff });
    } catch (error) {
        console.error("[Tournament Staff]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const body = await request.json();
        const parsed = tournamentStaffAssignSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const { id } = await params;
        const role = parsed.data.role ?? "REFEREE";

        const user = await prisma.user.findUnique({
            where: { id: parsed.data.userId },
            select: { id: true, fullName: true, status: true },
        });
        if (!user) {
            return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
        }
        if (user.status !== "ACTIVE") {
            return NextResponse.json({ success: false, message: "User tidak aktif" }, { status: 400 });
        }

        const staff = await prisma.tournamentStaff.create({
            data: {
                tournamentId: id,
                userId: parsed.data.userId,
                role,
            },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.REFEREE_ASSIGNED,
            targetId: staff.id,
            targetType: "TournamentStaff",
            details: {
                tournamentId: id,
                staffUserId: parsed.data.userId,
                staffRole: role,
            },
        });

        return NextResponse.json({ success: true, staff }, { status: 201 });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ success: false, message: "User sudah menjadi staff turnamen ini" }, { status: 409 });
        }
        console.error("[Tournament Staff Create]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
