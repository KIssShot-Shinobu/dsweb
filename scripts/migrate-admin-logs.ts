import { prisma } from '@/lib/prisma';

async function migrateAdminLogs() {
    console.log('Starting AdminLog migration...');

    // Note: Only run this if AdminLog still exists in your schema!
    // Since we already merged AdminLog into AuditLog in schema.prisma,
    // this script is provided for reference or if you revert the schema.
    try {
        const adminLogs = await (prisma as any).adminLog.findMany({
            include: { admin: true, target: true },
        });

        let migrated = 0;
        let failed = 0;

        for (const log of adminLogs) {
            try {
                await prisma.auditLog.create({
                    data: {
                        userId: log.adminId,
                        action: mapAdminActionToAuditAction(log.action),
                        targetId: log.targetId,
                        targetType: 'USER',
                        ipAddress: '0.0.0.0',
                        userAgent: 'MIGRATED',
                        reason: log.reason,
                        details: log.details,
                        createdAt: log.createdAt,
                    },
                });
                migrated++;
            } catch (error) {
                console.error('Failed to migrate log:', log.id, error);
                failed++;
            }
        }

        console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
    } catch (e) {
        console.log('AdminLog table may not exist, skipping migration.', e);
    }
}

function mapAdminActionToAuditAction(action: string): string {
    const map: Record<string, string> = {
        'APPROVE': 'MEMBER_APPROVED',
        'REJECT': 'MEMBER_REJECTED',
        'BAN': 'MEMBER_BANNED',
        'UNBAN': 'MEMBER_UNBANNED',
        'ROLE_CHANGE': 'ROLE_CHANGED',
    };
    return map[action] || action;
}

migrateAdminLogs().catch(console.error);
