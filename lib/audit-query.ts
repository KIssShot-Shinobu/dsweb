export function buildAuditLogWhere(searchParams: URLSearchParams) {
    const action = searchParams.get("action");
    const targetUserId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};

    if (action && action !== "ALL") {
        where.action = action;
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
