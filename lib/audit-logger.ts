import { prisma } from './prisma';
import { headers } from 'next/headers';
import { stringifyDetails, validateSafeForLog } from './audit-utils';
import { AuditActionType } from './audit-actions';

export interface AuditLogData {
    userId?: string;
    action: AuditActionType;
    targetId?: string;
    targetType?: string;
    reason?: string;
    details?: Record<string, any>;
    requestPath?: string;
    requestMethod?: string;
    responseStatus?: number;
}

export function extractIP(headers: Headers): string {
    const cfIP = headers.get('cf-connecting-ip');
    if (cfIP) return cfIP;

    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIP = headers.get('x-real-ip');
    if (realIP) return realIP;

    return '127.0.0.1';
}

export async function logAudit(data: AuditLogData): Promise<void> {
    try {
        let headersList: Headers;
        let ip = '127.0.0.1';
        let userAgent = 'unknown';

        try {
            headersList = await headers();
            ip = extractIP(headersList);
            userAgent = headersList.get('user-agent') || 'unknown';
        } catch {
            // Ignored
        }

        if (data.details && !validateSafeForLog(data.details)) {
            console.warn('[AuditLogger] Sensitive data filtered from log');
        }

        prisma.auditLog.create({
            data: {
                userId: data.userId || "0",
                action: data.action,
                targetId: data.targetId,
                targetType: data.targetType,
                ipAddress: ip,
                userAgent: userAgent,
                requestPath: data.requestPath,
                requestMethod: data.requestMethod,
                responseStatus: data.responseStatus,
                reason: data.reason,
                details: data.details ? stringifyDetails(data.details) : null,
            },
        }).catch((e: any) => {
            console.error("[Audit Logger Error] Failed to write log:", e);
        });
    } catch (error) {
        console.error('[AuditLogger] Failed to log activity:', error);
    }
}

export async function getUserAuditLogs(userId: string, limit: number = 50) {
    return await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            user: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                },
            },
        },
    });
}
