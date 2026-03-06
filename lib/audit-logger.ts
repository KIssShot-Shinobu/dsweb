import prisma from "./prisma";
import { headers } from "next/headers";

type AuditAction =
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "LOGOUT"
    | "USER_REGISTERED"
    | "PASSWORD_RESET_REQUEST"
    | "PASSWORD_RESET_SUCCESS"
    | "MEMBER_APPROVED"
    | "MEMBER_REJECTED"
    | "MEMBER_BANNED"
    | "MEMBER_UNBANNED"
    | "MEMBER_DELETED"
    | "ROLE_CHANGED"
    | "PROFILE_UPDATED"
    | "GAME_PROFILE_UPDATED"
    | "FILE_UPLOADED"
    | "RATE_LIMIT_HIT"
    | "SUSPICIOUS_ACTIVITY";

interface LogAuditParams {
    userId?: string;
    action: AuditAction;
    targetId?: string;
    targetType?: string;
    details?: Record<string, any>;
}

export async function logAudit({
    userId = "0",
    action,
    targetId,
    targetType,
    details,
}: LogAuditParams) {
    try {
        let ipAddress = "127.0.0.1";
        let userAgent = "Unknown";

        // Use next/headers if possible
        try {
            const headersList = await headers();
            ipAddress = headersList.get("x-forwarded-for")?.split(',')[0] || headersList.get("x-real-ip") || "127.0.0.1";
            userAgent = headersList.get("user-agent") || "Unknown";
        } catch (e) {
            // Ignored if headers() is not available in the current context
        }

        // Sanitize details to not include passwords or sensitive tokens just in case
        const sanitizedDetails = { ...details };
        if (sanitizedDetails.password) delete sanitizedDetails.password;
        if (sanitizedDetails.token) delete sanitizedDetails.token;

        // Run this asynchronously without waiting to block the main thread unnecessarily
        // However, Prisma client needs to stay alive, so we just run the promise
        prisma.auditLog.create({
            data: {
                userId,
                action,
                targetId,
                targetType,
                ipAddress,
                userAgent,
                details: sanitizedDetails && Object.keys(sanitizedDetails).length > 0
                    ? JSON.stringify(sanitizedDetails)
                    : null,
            },
        }).catch((e: any) => {
            console.error("[Audit Logger Error] Failed to write log to DB:", e);
        });

    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("[Audit Logger Error] Unexpected error:", error);
        }
    }
}
