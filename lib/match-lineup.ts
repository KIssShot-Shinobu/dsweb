const LINEUP_LOCK_STATUSES = new Set(["ONGOING", "RESULT_SUBMITTED", "CONFIRMED", "DISPUTED", "COMPLETED"]);

export function isLineupLocked(status: string) {
    return LINEUP_LOCK_STATUSES.has(status);
}

export function normalizeLineupMemberIds(memberIds: string[]) {
    return Array.from(new Set(memberIds));
}

export function isValidLineupSize(memberIds: string[], lineupSize: number) {
    return memberIds.length === lineupSize;
}
