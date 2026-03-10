import { NextResponse } from "next/server";
import { teamJoinRequestSchema } from "@/lib/validators";
import { createTeamService } from "@/lib/services/team.service";
import { handleTeamApiError, parseJsonBody, requireCurrentUser } from "@/lib/team-route";

const teamService = createTeamService();

export async function POST(request: Request) {
    try {
        const user = await requireCurrentUser();
        const input = await parseJsonBody(request, teamJoinRequestSchema);
        const joinRequest = await teamService.requestJoin(user.id, input);
        return NextResponse.json({ success: true, data: joinRequest }, { status: 201 });
    } catch (error) {
        return handleTeamApiError(error);
    }
}
