type MatchReportSummary = {
    reportedById: string;
    scoreA: number;
    scoreB: number;
    winnerId: string;
    createdAt: Date;
};

type MatchAutoConfirmCandidate = {
    id: string;
    tournamentId: string;
    reports: MatchReportSummary[];
};

export function getAutoConfirmCandidates(matches: MatchAutoConfirmCandidate[], cutoff: Date) {
    return matches.filter((match) => {
        if (match.reports.length !== 1) return false;
        const report = match.reports[0];
        return report.createdAt <= cutoff;
    });
}

export type AutoConfirmCandidate = ReturnType<typeof getAutoConfirmCandidates>[number];
