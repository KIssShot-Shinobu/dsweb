import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { TeamServiceError } from "@/lib/services/team.service";

export async function requireCurrentUser() {
    const user = await getCurrentUser();
    if (!user) {
        throw new TeamServiceError(401, "Unauthorized");
    }

    return user;
}

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>) {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
        throw new TeamServiceError(400, parsed.error.issues[0]?.message || "Input tidak valid");
    }

    return parsed.data;
}

export function handleTeamApiError(error: unknown) {
    if (error instanceof TeamServiceError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error("[Team API]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}
