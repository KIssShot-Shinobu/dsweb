import { Prisma, type PrismaClient } from "@prisma/client";
import { getLeaderboardDefaultElo } from "@/lib/runtime-config";

type LeaderboardClient = PrismaClient | Prisma.TransactionClient;

type EloInput = {
    ratingA: number;
    ratingB: number;
    scoreA: 0 | 1;
    matchesPlayedA: number;
    matchesPlayedB: number;
    placementMatchesPlayedA?: number;
    placementMatchesPlayedB?: number;
};

export type EloResult = {
    expectedA: number;
    expectedB: number;
    newRatingA: number;
    newRatingB: number;
    deltaA: number;
    deltaB: number;
    kFactorA: number;
    kFactorB: number;
};

export type LeaderboardEntrySummary = {
    id: string;
    eloRating: number;
    rankTier: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    lastMatchAt: Date | null;
    user: { id: string; username: string | null; fullName: string | null; avatarUrl: string | null };
};

export type TeamLeaderboardEntrySummary = {
    id: string;
    eloRating: number;
    wins: number;
    losses: number;
    matchesPlayed: number;
    lastMatchAt: Date | null;
    team: { id: string; name: string; slug: string; logoUrl: string | null };
};

type EnsureEntryOptions = {
    seasonId: string | null;
    gameId: string | null;
    defaultElo: number;
};

type ApplyLeaderboardResult = {
    applied: boolean;
};

const normalizeSeasonId = (seasonId: string | null) => seasonId ?? null;

const isTeamTournament = (value: { isTeamTournament: boolean; mode: string }) =>
    Boolean(value.isTeamTournament || value.mode !== "INDIVIDUAL");

const normalizeMemberIds = (value: unknown) =>
    Array.isArray(value)
        ? Array.from(new Set(value.filter((item): item is string => typeof item === "string")))
        : [];

const getSeasonScopes = (seasonId: string | null) => {
    const scopes: Array<string | null> = [null];
    if (seasonId) scopes.push(seasonId);
    return scopes;
};

const PLACEMENT_MATCH_LIMIT = 10;
const PLACEMENT_K_FACTOR = 50;
const MAX_MATCHES_PER_OPPONENT_PER_DAY = 5;

export function isPlacementPhase(placementMatchesPlayed: number) {
    return placementMatchesPlayed < PLACEMENT_MATCH_LIMIT;
}

export function getKFactor(matchesPlayed: number, elo: number, placementMatchesPlayed?: number) {
    if (typeof placementMatchesPlayed === "number" && isPlacementPhase(placementMatchesPlayed)) {
        return PLACEMENT_K_FACTOR;
    }
    if (matchesPlayed < 30) return 40;
    if (elo > 2000) return 16;
    return 32;
}

export function getRankTier(elo: number) {
    if (elo >= 2100) return "Diamond";
    if (elo >= 1800) return "Platinum";
    if (elo >= 1500) return "Gold";
    if (elo >= 1200) return "Silver";
    return "Bronze";
}

export function applySeasonReset(elo: number, baseElo = 1500) {
    return baseElo + (elo - baseElo) * 0.5;
}

export function calculateElo(input: EloInput): EloResult {
    const kFactorA = getKFactor(input.matchesPlayedA, input.ratingA, input.placementMatchesPlayedA);
    const kFactorB = getKFactor(input.matchesPlayedB, input.ratingB, input.placementMatchesPlayedB);
    const expectedA = 1 / (1 + Math.pow(10, (input.ratingB - input.ratingA) / 400));
    const expectedB = 1 - expectedA;
    const scoreB = input.scoreA === 1 ? 0 : 1;
    const newRatingA = input.ratingA + kFactorA * (input.scoreA - expectedA);
    const newRatingB = input.ratingB + kFactorB * (scoreB - expectedB);
    return {
        expectedA,
        expectedB,
        newRatingA,
        newRatingB,
        deltaA: newRatingA - input.ratingA,
        deltaB: newRatingB - input.ratingB,
        kFactorA,
        kFactorB,
    };
}

export async function ensurePlayerEntry(
    prisma: LeaderboardClient,
    userId: string,
    options: EnsureEntryOptions
) {
    const seasonId = normalizeSeasonId(options.seasonId);
    const where = { userId, seasonId, gameId: options.gameId };
    const existing = await prisma.leaderboardEntry.findFirst({ where });
    if (existing) return existing;

    try {
        return await prisma.leaderboardEntry.create({
            data: {
                userId,
                gameId: options.gameId,
                seasonId,
                eloRating: options.defaultElo,
                placementMatchesPlayed: 0,
                rankTier: getRankTier(options.defaultElo),
            },
        });
    } catch (error) {
        const fallback = await prisma.leaderboardEntry.findFirst({ where });
        if (fallback) return fallback;
        throw error;
    }
}

export async function ensureTeamEntry(
    prisma: LeaderboardClient,
    teamId: string,
    options: EnsureEntryOptions
) {
    const seasonId = normalizeSeasonId(options.seasonId);
    const where = { teamId, seasonId, gameId: options.gameId };
    const existing = await prisma.teamLeaderboardEntry.findFirst({ where });
    if (existing) return existing;

    try {
        return await prisma.teamLeaderboardEntry.create({
            data: {
                teamId,
                gameId: options.gameId,
                seasonId,
                eloRating: options.defaultElo,
            },
        });
    } catch (error) {
        const fallback = await prisma.teamLeaderboardEntry.findFirst({ where });
        if (fallback) return fallback;
        throw error;
    }
}

async function normalizeLegacyPlayerEntry(
    prisma: LeaderboardClient,
    entry: { id: string; matchesPlayed: number; placementMatchesPlayed: number; eloRating: number; rankTier: string }
) {
    const computedTier = getRankTier(entry.eloRating);
    const normalizedPlacement = entry.placementMatchesPlayed < entry.matchesPlayed ? entry.matchesPlayed : entry.placementMatchesPlayed;
    if (computedTier === entry.rankTier && normalizedPlacement === entry.placementMatchesPlayed) {
        return entry;
    }

    return prisma.leaderboardEntry.update({
        where: { id: entry.id },
        data: {
            placementMatchesPlayed: normalizedPlacement,
            rankTier: computedTier,
        },
    });
}

export async function getTopPlayers(
    prisma: PrismaClient,
    input: { limit: number; seasonId: string | null; gameId: string | null; skip?: number }
): Promise<LeaderboardEntrySummary[]> {
    const seasonId = normalizeSeasonId(input.seasonId);
    const entries = await prisma.leaderboardEntry.findMany({
        where: { seasonId, gameId: input.gameId },
        orderBy: [{ eloRating: "desc" }, { updatedAt: "asc" }, { id: "asc" }],
        take: input.limit,
        skip: input.skip,
        select: {
            id: true,
            eloRating: true,
            rankTier: true,
            wins: true,
            losses: true,
            matchesPlayed: true,
            lastMatchAt: true,
            user: {
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                },
            },
        },
    });

    return entries;
}

export async function getTopTeams(
    prisma: PrismaClient,
    input: { limit: number; seasonId: string | null; gameId: string | null; skip?: number }
): Promise<TeamLeaderboardEntrySummary[]> {
    const seasonId = normalizeSeasonId(input.seasonId);
    const entries = await prisma.teamLeaderboardEntry.findMany({
        where: { seasonId, gameId: input.gameId },
        orderBy: [{ eloRating: "desc" }, { updatedAt: "asc" }, { id: "asc" }],
        take: input.limit,
        skip: input.skip,
        select: {
            id: true,
            eloRating: true,
            wins: true,
            losses: true,
            matchesPlayed: true,
            lastMatchAt: true,
            team: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                },
            },
        },
    });

    return entries;
}

async function applyPlayerEloScope(
    prisma: LeaderboardClient,
    scopeSeasonId: string | null,
    gameId: string,
    matchId: string,
    playerAUserId: string,
    playerBUserId: string,
    winnerSide: "A" | "B",
    now: Date,
    defaultElo: number
) {
    const entryA = await ensurePlayerEntry(prisma, playerAUserId, { seasonId: scopeSeasonId, gameId, defaultElo });
    const entryB = await ensurePlayerEntry(prisma, playerBUserId, { seasonId: scopeSeasonId, gameId, defaultElo });
    const normalizedA = await normalizeLegacyPlayerEntry(prisma, entryA);
    const normalizedB = await normalizeLegacyPlayerEntry(prisma, entryB);
    const result = calculateElo({
        ratingA: normalizedA.eloRating,
        ratingB: normalizedB.eloRating,
        scoreA: winnerSide === "A" ? 1 : 0,
        matchesPlayedA: normalizedA.matchesPlayed,
        matchesPlayedB: normalizedB.matchesPlayed,
        placementMatchesPlayedA: normalizedA.placementMatchesPlayed,
        placementMatchesPlayedB: normalizedB.placementMatchesPlayed,
    });
    const nextRankA = getRankTier(result.newRatingA);
    const nextRankB = getRankTier(result.newRatingB);

    await prisma.leaderboardEntry.update({
        where: { id: normalizedA.id },
        data: {
            eloRating: result.newRatingA,
            rankTier: nextRankA,
            wins: { increment: winnerSide === "A" ? 1 : 0 },
            losses: { increment: winnerSide === "A" ? 0 : 1 },
            matchesPlayed: { increment: 1 },
            placementMatchesPlayed: { increment: 1 },
            lastMatchAt: now,
        },
    });

    await prisma.leaderboardEntry.update({
        where: { id: normalizedB.id },
        data: {
            eloRating: result.newRatingB,
            rankTier: nextRankB,
            wins: { increment: winnerSide === "B" ? 1 : 0 },
            losses: { increment: winnerSide === "B" ? 0 : 1 },
            matchesPlayed: { increment: 1 },
            placementMatchesPlayed: { increment: 1 },
            lastMatchAt: now,
        },
    });

    await prisma.leaderboardHistory.createMany({
        data: [
            {
                userId: normalizedA.userId,
                gameId,
                matchId,
                seasonId: scopeSeasonId,
                eloBefore: normalizedA.eloRating,
                eloAfter: result.newRatingA,
                delta: result.deltaA,
                createdAt: now,
            },
            {
                userId: normalizedB.userId,
                gameId,
                matchId,
                seasonId: scopeSeasonId,
                eloBefore: normalizedB.eloRating,
                eloAfter: result.newRatingB,
                delta: result.deltaB,
                createdAt: now,
            },
        ],
    });
}

async function applyTeamEloScope(
    prisma: LeaderboardClient,
    scopeSeasonId: string | null,
    gameId: string,
    matchId: string,
    teamAId: string,
    teamBId: string,
    winnerSide: "A" | "B",
    now: Date,
    defaultElo: number
) {
    const entryA = await ensureTeamEntry(prisma, teamAId, { seasonId: scopeSeasonId, gameId, defaultElo });
    const entryB = await ensureTeamEntry(prisma, teamBId, { seasonId: scopeSeasonId, gameId, defaultElo });
    const result = calculateElo({
        ratingA: entryA.eloRating,
        ratingB: entryB.eloRating,
        scoreA: winnerSide === "A" ? 1 : 0,
        matchesPlayedA: entryA.matchesPlayed,
        matchesPlayedB: entryB.matchesPlayed,
    });

    await prisma.teamLeaderboardEntry.update({
        where: { id: entryA.id },
        data: {
            eloRating: result.newRatingA,
            wins: { increment: winnerSide === "A" ? 1 : 0 },
            losses: { increment: winnerSide === "A" ? 0 : 1 },
            matchesPlayed: { increment: 1 },
            lastMatchAt: now,
        },
    });

    await prisma.teamLeaderboardEntry.update({
        where: { id: entryB.id },
        data: {
            eloRating: result.newRatingB,
            wins: { increment: winnerSide === "B" ? 1 : 0 },
            losses: { increment: winnerSide === "B" ? 0 : 1 },
            matchesPlayed: { increment: 1 },
            lastMatchAt: now,
        },
    });

    await prisma.leaderboardHistory.createMany({
        data: [
            {
                teamId: entryA.teamId,
                gameId,
                matchId,
                seasonId: scopeSeasonId,
                eloBefore: entryA.eloRating,
                eloAfter: result.newRatingA,
                delta: result.deltaA,
                createdAt: now,
            },
            {
                teamId: entryB.teamId,
                gameId,
                matchId,
                seasonId: scopeSeasonId,
                eloBefore: entryB.eloRating,
                eloAfter: result.newRatingB,
                delta: result.deltaB,
                createdAt: now,
            },
        ],
    });
}

async function applyLineupEloScope(
    prisma: LeaderboardClient,
    scopeSeasonId: string | null,
    gameId: string,
    matchId: string,
    lineupA: string[],
    lineupB: string[],
    winnerSide: "A" | "B",
    now: Date,
    defaultElo: number
) {
    if (lineupA.length === 0 || lineupB.length === 0) return false;

    const entriesA = await Promise.all(lineupA.map((userId) =>
        ensurePlayerEntry(prisma, userId, { seasonId: scopeSeasonId, gameId, defaultElo })
    ));
    const entriesB = await Promise.all(lineupB.map((userId) =>
        ensurePlayerEntry(prisma, userId, { seasonId: scopeSeasonId, gameId, defaultElo })
    ));
    const normalizedEntriesA = await Promise.all(entriesA.map((entry) => normalizeLegacyPlayerEntry(prisma, entry)));
    const normalizedEntriesB = await Promise.all(entriesB.map((entry) => normalizeLegacyPlayerEntry(prisma, entry)));

    const avgA = normalizedEntriesA.reduce((sum, entry) => sum + entry.eloRating, 0) / normalizedEntriesA.length;
    const avgB = normalizedEntriesB.reduce((sum, entry) => sum + entry.eloRating, 0) / normalizedEntriesB.length;
    const result = calculateElo({
        ratingA: avgA,
        ratingB: avgB,
        scoreA: winnerSide === "A" ? 1 : 0,
        matchesPlayedA: Math.round(normalizedEntriesA.reduce((sum, entry) => sum + entry.matchesPlayed, 0) / normalizedEntriesA.length),
        matchesPlayedB: Math.round(normalizedEntriesB.reduce((sum, entry) => sum + entry.matchesPlayed, 0) / normalizedEntriesB.length),
        placementMatchesPlayedA: Math.round(normalizedEntriesA.reduce((sum, entry) => sum + entry.placementMatchesPlayed, 0) / normalizedEntriesA.length),
        placementMatchesPlayedB: Math.round(normalizedEntriesB.reduce((sum, entry) => sum + entry.placementMatchesPlayed, 0) / normalizedEntriesB.length),
    });

    const deltaA = result.newRatingA - avgA;
    const deltaB = result.newRatingB - avgB;

    await Promise.all(
        normalizedEntriesA.map((entry) =>
            prisma.leaderboardEntry.update({
                where: { id: entry.id },
                data: {
                    eloRating: entry.eloRating + deltaA,
                    rankTier: getRankTier(entry.eloRating + deltaA),
                    wins: { increment: winnerSide === "A" ? 1 : 0 },
                    losses: { increment: winnerSide === "A" ? 0 : 1 },
                    matchesPlayed: { increment: 1 },
                    placementMatchesPlayed: { increment: 1 },
                    lastMatchAt: now,
                },
            })
        )
    );

    await Promise.all(
        normalizedEntriesB.map((entry) =>
            prisma.leaderboardEntry.update({
                where: { id: entry.id },
                data: {
                    eloRating: entry.eloRating + deltaB,
                    rankTier: getRankTier(entry.eloRating + deltaB),
                    wins: { increment: winnerSide === "B" ? 1 : 0 },
                    losses: { increment: winnerSide === "B" ? 0 : 1 },
                    matchesPlayed: { increment: 1 },
                    placementMatchesPlayed: { increment: 1 },
                    lastMatchAt: now,
                },
            })
        )
    );

    const historyPayload = [
        ...normalizedEntriesA.map((entry) => ({
            userId: entry.userId,
            gameId,
            matchId,
            seasonId: scopeSeasonId,
            eloBefore: entry.eloRating,
            eloAfter: entry.eloRating + deltaA,
            delta: deltaA,
            createdAt: now,
        })),
        ...normalizedEntriesB.map((entry) => ({
            userId: entry.userId,
            gameId,
            matchId,
            seasonId: scopeSeasonId,
            eloBefore: entry.eloRating,
            eloAfter: entry.eloRating + deltaB,
            delta: deltaB,
            createdAt: now,
        })),
    ];

    if (historyPayload.length > 0) {
        await prisma.leaderboardHistory.createMany({ data: historyPayload });
    }

    return true;
}

async function shouldApplyLeaderboardUpdate(
    prisma: LeaderboardClient,
    matchId: string,
    now: Date,
    participants: { userA?: string | null; userB?: string | null; teamA?: string | null; teamB?: string | null }
) {
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    if (participants.userA && participants.userB) {
        const dailyCount = await prisma.matchResult.count({
            where: {
                matchId: { not: matchId },
                leaderboardAppliedAt: { gte: dayStart, lt: dayEnd },
                match: {
                    status: "COMPLETED",
                    OR: [
                        { playerA: { userId: participants.userA }, playerB: { userId: participants.userB } },
                        { playerA: { userId: participants.userB }, playerB: { userId: participants.userA } },
                    ],
                },
            },
        });
        if (dailyCount >= MAX_MATCHES_PER_OPPONENT_PER_DAY) return false;
    }

    if (participants.teamA && participants.teamB) {
        const dailyCount = await prisma.matchResult.count({
            where: {
                matchId: { not: matchId },
                leaderboardAppliedAt: { gte: dayStart, lt: dayEnd },
                match: {
                    status: "COMPLETED",
                    OR: [
                        { playerA: { teamId: participants.teamA }, playerB: { teamId: participants.teamB } },
                        { playerA: { teamId: participants.teamB }, playerB: { teamId: participants.teamA } },
                    ],
                },
            },
        });
        if (dailyCount >= MAX_MATCHES_PER_OPPONENT_PER_DAY) return false;
    }

    return true;
}

export async function applyLeaderboardForMatch(
    prisma: LeaderboardClient,
    matchId: string,
    options: { now?: Date; defaultElo?: number } = {}
): Promise<ApplyLeaderboardResult> {
    const now = options.now ?? new Date();
    const defaultElo = options.defaultElo ?? getLeaderboardDefaultElo();

    const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
            id: true,
            winnerId: true,
            playerAId: true,
            playerBId: true,
            playerA: { select: { userId: true, teamId: true } },
            playerB: { select: { userId: true, teamId: true } },
            tournament: { select: { seasonId: true, isTeamTournament: true, mode: true, gameId: true } },
        },
    });

    if (!match) {
        return { applied: false };
    }

    const winnerSide = match.winnerId === match.playerAId ? "A" : match.winnerId === match.playerBId ? "B" : null;
    const gameId = match.tournament?.gameId ?? null;
    let seasonId = match.tournament?.seasonId ?? null;
    if (!seasonId) {
        const activeSeason = await prisma.season.findFirst({
            where: { isActive: true },
            orderBy: { startAt: "desc" },
            select: { id: true },
        });
        seasonId = activeSeason?.id ?? null;
    }
    if (!gameId) {
        await prisma.matchResult.update({
            where: { matchId },
            data: { leaderboardAppliedAt: now },
        });
        return { applied: false };
    }
    const scopes = getSeasonScopes(seasonId);
    let applied = false;

    if (!winnerSide) {
        await prisma.matchResult.update({
            where: { matchId },
            data: { leaderboardAppliedAt: now },
        });
        return { applied: false };
    }

    const allowUpdate = await shouldApplyLeaderboardUpdate(prisma, matchId, now, {
        userA: match.playerA?.userId ?? null,
        userB: match.playerB?.userId ?? null,
        teamA: match.playerA?.teamId ?? null,
        teamB: match.playerB?.teamId ?? null,
    });
    if (!allowUpdate) {
        await prisma.matchResult.update({
            where: { matchId },
            data: { leaderboardAppliedAt: now },
        });
        return { applied: false };
    }

    if (match.tournament && isTeamTournament(match.tournament)) {
        const teamAId = match.playerA?.teamId ?? null;
        const teamBId = match.playerB?.teamId ?? null;
        if (teamAId && teamBId) {
            for (const scopeSeasonId of scopes) {
                await applyTeamEloScope(prisma, scopeSeasonId, gameId, matchId, teamAId, teamBId, winnerSide, now, defaultElo);
                applied = true;
            }

            const lineups = await prisma.matchLineup.findMany({
                where: { matchId, teamId: { in: [teamAId, teamBId] } },
                select: { teamId: true, memberIds: true },
            });
            const lineupA = lineups.find((lineup) => lineup.teamId === teamAId);
            const lineupB = lineups.find((lineup) => lineup.teamId === teamBId);
            const memberIdsA = normalizeMemberIds(lineupA?.memberIds);
            const memberIdsB = normalizeMemberIds(lineupB?.memberIds);

            if (memberIdsA.length > 0 && memberIdsB.length > 0) {
                for (const scopeSeasonId of scopes) {
                    const appliedLineup = await applyLineupEloScope(
                        prisma,
                        scopeSeasonId,
                        gameId,
                        matchId,
                        memberIdsA,
                        memberIdsB,
                        winnerSide,
                        now,
                        defaultElo
                    );
                    applied = applied || appliedLineup;
                }
            }
        }
    } else {
        const playerAUserId = match.playerA?.userId ?? null;
        const playerBUserId = match.playerB?.userId ?? null;
        if (playerAUserId && playerBUserId) {
            for (const scopeSeasonId of scopes) {
                await applyPlayerEloScope(
                    prisma,
                    scopeSeasonId,
                    gameId,
                    matchId,
                    playerAUserId,
                    playerBUserId,
                    winnerSide,
                    now,
                    defaultElo
                );
                applied = true;
            }
        }
    }

    await prisma.matchResult.update({
        where: { matchId },
        data: { leaderboardAppliedAt: now },
    });

    return { applied };
}

export const leaderboardSeasonGameFilter = (seasonId: string | null, gameId: string) =>
    Prisma.sql`le.gameId = ${gameId} AND ${seasonId ? Prisma.sql`le.seasonId = ${seasonId}` : Prisma.sql`le.seasonId IS NULL`}`;
