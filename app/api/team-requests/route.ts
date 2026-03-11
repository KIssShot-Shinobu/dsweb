import { NextRequest, NextResponse } from "next/server";
import { hasRole } from "@/lib/auth";
import { createTeamRequestService } from "@/lib/services/team-request.service";
import { handleTeamApiError, requireCurrentUser, parseJsonBody } from "@/lib/team-route";
import { teamRequestCreateSchema, teamRequestQuerySchema } from "@/lib/validators";

const teamRequestService = createTeamRequestService();

export async function GET(request: NextRequest) {
    try {
        const user = await requireCurrentUser();
        const { searchParams } = new URL(request.url);
        const parsed = teamRequestQuerySchema.safeParse({
            status: searchParams.get("status") || undefined,
            mine: searchParams.get("mine") || undefined,
        });

        if (!parsed.success) {
            return NextResponse.json({ success: false, error: "Filter permintaan team tidak valid." }, { status: 400 });
        }

        if (parsed.data.mine === "1") {
            const requests = await teamRequestService.listUserRequests(user.id);
            return NextResponse.json({ success: true, data: requests });
        }

        if (!hasRole(user.role, "ADMIN")) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const requests = await teamRequestService.listRequests(parsed.data.status);
        return NextResponse.json({ success: true, data: requests });
    } catch (error) {
        return handleTeamApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireCurrentUser();
        const input = await parseJsonBody(request, teamRequestCreateSchema);
        const requestRecord = await teamRequestService.createRequest(user.id, input);
        return NextResponse.json({ success: true, data: requestRecord }, { status: 201 });
    } catch (error) {
        return handleTeamApiError(error);
    }
}
