import { TournamentFormat } from "@prisma/client";

type MatchScoreInput = {
    scoreA: number;
    scoreB: number;
    winnerId: string;
    playerAId: string | null;
    playerBId: string | null;
    format: TournamentFormat;
};

export function getRequiredWinsForFormat(format: TournamentFormat) {
    if (format === "BO1") return 1;
    if (format === "BO5") return 3;
    return 2;
}

export function validateMatchScore(input: MatchScoreInput) {
    const { scoreA, scoreB, winnerId, playerAId, playerBId, format } = input;
    if (!playerAId || !playerBId) {
        return "Match belum memiliki dua pemain.";
    }

    if (![playerAId, playerBId].includes(winnerId)) {
        return "Winner ID tidak valid untuk match ini.";
    }

    const requiredWins = getRequiredWinsForFormat(format);
    if (scoreA < 0 || scoreB < 0) {
        return "Skor tidak boleh negatif.";
    }
    if (scoreA > requiredWins || scoreB > requiredWins) {
        return `Skor maksimal untuk format ini adalah ${requiredWins}.`;
    }
    if (scoreA === scoreB) {
        return "Skor tidak boleh imbang.";
    }

    const winnerScore = winnerId === playerAId ? scoreA : scoreB;
    const loserScore = winnerId === playerAId ? scoreB : scoreA;

    if (winnerScore !== requiredWins) {
        return `Skor pemenang harus ${requiredWins} untuk format ini.`;
    }
    if (loserScore >= requiredWins) {
        return `Skor lawan harus kurang dari ${requiredWins}.`;
    }

    return null;
}
