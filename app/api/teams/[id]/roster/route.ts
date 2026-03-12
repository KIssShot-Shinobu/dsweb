import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { createTeamService, TeamServiceError } from "@/lib/services/team.service";
import { teamRosterAdminAssignSchema } from "@/lib/validators";

const teamService = createTeamService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = teamRosterAdminAssignSchema.safeParse({
        teamId: id,
        userId: body?.userId,
        role: body?.role,
    });

    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    try {
        const membership = await teamService.assignMemberAsAdmin(currentUser.id, parsed.data);
        return NextResponse.json({ success: true, data: membership, message: "Roster berhasil ditambahkan." }, { status: 200 });
    } catch (error) {
        if (error instanceof TeamServiceError) {
            return NextResponse.json({ success: false, message: error.message }, { status: error.status });
        }
        console.error("[Team Roster Assign]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = teamRosterAdminAssignSchema.safeParse({
        teamId: id,
        userId: body?.userId,
    });

    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    try {
        const membership = await teamService.unassignMemberAsAdmin(currentUser.id, parsed.data);
        return NextResponse.json({ success: true, data: membership, message: "Roster berhasil dilepas." }, { status: 200 });
    } catch (error) {
        if (error instanceof TeamServiceError) {
            return NextResponse.json({ success: false, message: error.message }, { status: error.status });
        }
        console.error("[Team Roster Unassign]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
