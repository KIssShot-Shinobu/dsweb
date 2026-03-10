import { NextResponse } from "next/server";
import { teamLeaveSchema } from "@/lib/validators";
import { createTeamService } from "@/lib/services/team.service";
import { handleTeamApiError, parseJsonBody, requireCurrentUser } from "@/lib/team-route";

const teamService = createTeamService();

export async function POST(request: Request) {
    try {
        const user = await requireCurrentUser();
        const input = await parseJsonBody(request, teamLeaveSchema);
        const membership = await teamService.leaveTeam(user.id, input);
        return NextResponse.json({ success: true, data: membership });
    } catch (error) {
        return handleTeamApiError(error);
    }
}
