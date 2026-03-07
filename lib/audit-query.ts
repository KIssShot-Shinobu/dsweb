const ACTION_ALIASES: Record<string, string[]> = {
    USER_APPROVED: ["USER_APPROVED", "MEMBER_APPROVED"],
    USER_REJECTED: ["USER_REJECTED", "MEMBER_REJECTED"],
    USER_BANNED: ["USER_BANNED", "MEMBER_BANNED"],
    USER_UNBANNED: ["USER_UNBANNED", "MEMBER_UNBANNED"],
    USER_CREATED: ["USER_CREATED", "MEMBER_CREATED"],
    USER_UPDATED: ["USER_UPDATED", "MEMBER_UPDATED"],
    USER_DELETED: ["USER_DELETED", "MEMBER_DELETED"],
    MEMBER_APPROVED: ["USER_APPROVED", "MEMBER_APPROVED"],
    MEMBER_REJECTED: ["USER_REJECTED", "MEMBER_REJECTED"],
    MEMBER_BANNED: ["USER_BANNED", "MEMBER_BANNED"],
    MEMBER_UNBANNED: ["USER_UNBANNED", "MEMBER_UNBANNED"],
    MEMBER_CREATED: ["USER_CREATED", "MEMBER_CREATED"],
    MEMBER_UPDATED: ["USER_UPDATED", "MEMBER_UPDATED"],
    MEMBER_DELETED: ["USER_DELETED", "MEMBER_DELETED"],
};

export function buildAuditLogWhere(searchParams: URLSearchParams) {
    const action = searchParams.get("action");
    const targetUserId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};

    if (action && action !== "ALL") {
        const aliases = ACTION_ALIASES[action];
        where.action = aliases ? { in: aliases } : action;
    }

    if (targetUserId) {
        where.userId = targetUserId;
    }

    if (startDate || endDate) {
        const createdAt: Record<string, Date> = {};
        if (startDate) createdAt.gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            createdAt.lte = end;
        }
        where.createdAt = createdAt;
    }

    if (search) {
        where.OR = [
            { action: { contains: search } },
            { userId: { contains: search } },
            { targetType: { contains: search } },
            { targetId: { contains: search } },
            { details: { contains: search } },
        ];
    }

    return where;
}
