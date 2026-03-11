import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth";
import { createTeamRequestService } from "@/lib/services/team-request.service";
import { handleTeamApiError, parseJsonBody, requireCurrentUser } from "@/lib/team-route";
import { teamRequestRejectSchema } from "@/lib/validators";

const teamRequestService = createTeamRequestService();

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireCurrentUser();
        if (!hasRole(user.role, "ADMIN")) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const input = await parseJsonBody(request, teamRequestRejectSchema);
        const { id } = await params;
        const result = await teamRequestService.rejectRequest(user.id, id, input.reason);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleTeamApiError(error);
    }
}
