import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { verifyEmailToken } from "@/lib/services/auth-email-service";
import { z } from "zod";

const verifyEmailSchema = z.object({
    token: z.string().min(20, "Token tidak valid"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = verifyEmailSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const result = await verifyEmailToken(
            {
                prisma: prisma as never,
                sendEmail: async () => undefined,
                logAudit,
                generateSecureToken: () => "",
                getAppUrl: () => "",
                emailVerificationTtlMs: 0,
            },
            parsed.data.token
        );

        return NextResponse.json(
            { success: result.success, message: result.message },
            result.success ? undefined : { status: result.status || 400 }
        );
    } catch (error) {
        console.error("[Verify Email API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

