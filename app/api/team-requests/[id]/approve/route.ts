import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth";
import { createTeamRequestService } from "@/lib/services/team-request.service";
import { handleTeamApiError, requireCurrentUser } from "@/lib/team-route";

const teamRequestService = createTeamRequestService();

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireCurrentUser();
        if (!hasRole(user.role, "ADMIN")) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const result = await teamRequestService.approveRequest(user.id, id);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleTeamApiError(error);
    }
}
