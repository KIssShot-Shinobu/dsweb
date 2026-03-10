import { NextResponse } from "next/server";
import { createTeamService } from "@/lib/services/team.service";
import { teamDeleteSchema } from "@/lib/validators";
import { handleTeamApiError, parseJsonBody, requireCurrentUser } from "@/lib/team-route";

const teamService = createTeamService();

export async function POST(req: Request) {
    try {
        const user = await requireCurrentUser();
        const input = await parseJsonBody(req, teamDeleteSchema);
        const result = await teamService.deleteTeam(user.id, input);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleTeamApiError(error);
    }
}
