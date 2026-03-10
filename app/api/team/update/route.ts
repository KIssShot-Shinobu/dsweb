import { NextResponse } from "next/server";
import { z } from "zod";
import { teamUpdateSchema } from "@/lib/validators";
import { createTeamService } from "@/lib/services/team.service";
import { handleTeamApiError, parseJsonBody, requireCurrentUser } from "@/lib/team-route";

const requestSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
    data: teamUpdateSchema,
});

const teamService = createTeamService();

export async function PATCH(request: Request) {
    try {
        const user = await requireCurrentUser();
        const input = await parseJsonBody(request, requestSchema);
        const team = await teamService.updateTeam(user.id, input.teamId, input.data);
        return NextResponse.json({ success: true, data: team });
    } catch (error) {
        return handleTeamApiError(error);
    }
}
