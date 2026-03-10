import { NextResponse } from "next/server";
import { teamInviteSchema } from "@/lib/validators";
import { createTeamService } from "@/lib/services/team.service";
import { handleTeamApiError, parseJsonBody, requireCurrentUser } from "@/lib/team-route";

const teamService = createTeamService();

export async function POST(request: Request) {
    try {
        const user = await requireCurrentUser();
        const input = await parseJsonBody(request, teamInviteSchema);
        const invite = await teamService.inviteUser(user.id, input);
        return NextResponse.json({ success: true, data: invite }, { status: 201 });
    } catch (error) {
        return handleTeamApiError(error);
    }
}
