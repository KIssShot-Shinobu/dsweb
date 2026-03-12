import { Prisma, type PrismaClient, MatchPlayerSide, MatchStatus, MatchResultSource, TournamentStructure, RoundType } from "@prisma/client";

type BracketParticipant = {
    userId: string;
};

type SeedAssignment = {
    userId: string;
    seed: number;
};

type BracketRound = {
    id: string;
    roundNumber: number;
    type: RoundType;
};

type BracketMatch = {
    id: string;
    bracketIndex: number;
    roundId: string;
};

type BracketContext = {
    upperRounds: BracketRound[];
    lowerRounds: BracketRound[];
    grandFinalRound: BracketRound | null;
    upperMatches: Record<number, BracketMatch[]>;
    lowerMatches: Record<number, BracketMatch[]>;
    grandFinalMatch: BracketMatch | null;
};

function shuffleArray<T>(items: T[]) {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateSeedOrder(bracketSize: number) {
    let order = [1, 2];
    while (order.length < bracketSize) {
        const next: number[] = [];
        const maxSeed = order.length * 2 + 1;
        for (const seed of order) {
            next.push(seed);
            next.push(maxSeed - seed);
        }
        order = next;
    }
    return order;
}

function buildSeededSlots(participants: BracketParticipant[], bracketSize: number) {
    const shuffled = shuffleArray(participants);
    const seedingOrder = generateSeedOrder(bracketSize);
    const slots: Array<string | null> = Array(bracketSize).fill(null);
    const assignments: SeedAssignment[] = [];

    for (let index = 0; index < shuffled.length; index += 1) {
        const targetSeed = seedingOrder[index];
        slots[targetSeed - 1] = shuffled[index]?.userId ?? null;
        if (shuffled[index]?.userId) {
            assignments.push({ userId: shuffled[index].userId, seed: targetSeed });
        }
    }

    return { slots, assignments };
}

function nextPowerOfTwo(value: number) {
    let size = 1;
    while (size < value) size *= 2;
    return size;
}

function buildSlots(participants: BracketParticipant[], bracketSize: number) {
    const slots = participants.map((item) => item.userId);
    while (slots.length < bracketSize) slots.push(null);
    return slots;
}

function mapSideToField(side: MatchPlayerSide) {
    return side === "A" ? "playerAId" : "playerBId";
}

async function ensureMatchPlayers(tx: PrismaClient, matchId: string, playerAId: string | null, playerBId: string | null) {
    const data: Prisma.MatchPlayerCreateManyInput[] = [];
    if (playerAId) data.push({ matchId, userId: playerAId, side: "A" });
    if (playerBId) data.push({ matchId, userId: playerBId, side: "B" });
    if (data.length === 0) return;

    await tx.matchPlayer.createMany({
        data,
        skipDuplicates: true,
    });
}

async function advanceWinnerAndLoser(tx: PrismaClient, matchId: string) {
    const match = await tx.match.findUnique({
        where: { id: matchId },
        select: {
            id: true,
            winnerId: true,
            playerAId: true,
            playerBId: true,
            nextMatchId: true,
            nextMatchSide: true,
            loserNextMatchId: true,
            loserNextMatchSide: true,
        },
    });

    if (!match || !match.winnerId) return;

    const loserId = match.playerAId === match.winnerId ? match.playerBId : match.playerAId;

    if (match.nextMatchId && match.nextMatchSide) {
        const nextField = mapSideToField(match.nextMatchSide);
        await tx.match.update({
            where: { id: match.nextMatchId },
            data: {
                [nextField]: match.winnerId,
            },
        });
        await ensureMatchPlayers(tx, match.nextMatchId, match.nextMatchSide === "A" ? match.winnerId : null, match.nextMatchSide === "B" ? match.winnerId : null);

        const nextMatch = await tx.match.findUnique({
            where: { id: match.nextMatchId },
            select: { playerAId: true, playerBId: true, status: true },
        });
        if (nextMatch?.playerAId && nextMatch?.playerBId && nextMatch.status === "PENDING") {
            await tx.match.update({
                where: { id: match.nextMatchId },
                data: { status: "READY" },
            });
        }
    }

    if (loserId && match.loserNextMatchId && match.loserNextMatchSide) {
        const loserField = mapSideToField(match.loserNextMatchSide);
        await tx.match.update({
            where: { id: match.loserNextMatchId },
            data: {
                [loserField]: loserId,
            },
        });
        await ensureMatchPlayers(tx, match.loserNextMatchId, match.loserNextMatchSide === "A" ? loserId : null, match.loserNextMatchSide === "B" ? loserId : null);

        const loserMatch = await tx.match.findUnique({
            where: { id: match.loserNextMatchId },
            select: { playerAId: true, playerBId: true, status: true },
        });
        if (loserMatch?.playerAId && loserMatch?.playerBId && loserMatch.status === "PENDING") {
            await tx.match.update({
                where: { id: match.loserNextMatchId },
                data: { status: "READY" },
            });
        }
    }
}

async function createRounds(tx: PrismaClient, tournamentId: string, rounds: Array<{ roundNumber: number; type: RoundType; name: string }>) {
    const result: BracketRound[] = [];
    for (const round of rounds) {
        const created = await tx.tournamentRound.create({
            data: {
                tournamentId,
                roundNumber: round.roundNumber,
                type: round.type,
                name: round.name,
                isActive: round.roundNumber === 1 && (round.type === "MAIN" || round.type === "UPPER" || round.type === "SWISS"),
            },
            select: { id: true, roundNumber: true, type: true },
        });
        result.push(created);
    }
    return result;
}

async function createMatches(tx: PrismaClient, tournamentId: string, round: BracketRound, count: number) {
    const matches: BracketMatch[] = [];
    for (let i = 0; i < count; i += 1) {
        const created = await tx.match.create({
            data: {
                tournamentId,
                roundId: round.id,
                bracketIndex: i + 1,
                status: "PENDING",
            },
            select: { id: true, bracketIndex: true, roundId: true },
        });
        matches.push(created);
    }
    return matches;
}

async function assignMatchPlayers(tx: PrismaClient, matchId: string, playerAId: string | null, playerBId: string | null) {
    let status: MatchStatus = "PENDING";
    let winnerId: string | null = null;
    let scoreA = 0;
    let scoreB = 0;

    if (playerAId && playerBId) {
        status = "READY";
    } else if (playerAId || playerBId) {
        status = "COMPLETED";
        winnerId = playerAId || playerBId;
        scoreA = playerAId ? 2 : 0;
        scoreB = playerBId ? 2 : 0;
    }

    await tx.match.update({
        where: { id: matchId },
        data: {
            playerAId,
            playerBId,
            status,
            winnerId,
            scoreA,
            scoreB,
            matchVersion: { increment: 1 },
        },
    });

    await ensureMatchPlayers(tx, matchId, playerAId, playerBId);

    if (status === "COMPLETED" && winnerId) {
        await tx.matchResult.create({
            data: {
                matchId,
                winnerId,
                scoreA,
                scoreB,
                source: "SYSTEM",
            },
        });
        await advanceWinnerAndLoser(tx, matchId);
    }
}

async function maybeAdvanceSwissRound(tx: PrismaClient, tournamentId: string, currentRoundNumber: number) {
    const currentRound = await tx.tournamentRound.findUnique({
        where: {
            tournamentId_roundNumber_type: {
                tournamentId,
                roundNumber: currentRoundNumber,
                type: "SWISS",
            },
        },
        select: { id: true },
    });

    if (!currentRound) return;

    const remaining = await tx.match.count({
        where: {
            roundId: currentRound.id,
            status: { not: "COMPLETED" },
        },
    });

    if (remaining > 0) return;

    const nextRound = await tx.tournamentRound.findUnique({
        where: {
            tournamentId_roundNumber_type: {
                tournamentId,
                roundNumber: currentRoundNumber + 1,
                type: "SWISS",
            },
        },
        select: { id: true },
    });

    if (!nextRound) {
        await tx.tournamentRound.update({
            where: { id: currentRound.id },
            data: { isActive: false, completedAt: new Date() },
        });
        return;
    }

    const existingMatches = await tx.match.count({
        where: { roundId: nextRound.id },
    });

    if (existingMatches > 0) return;

    const participants = await tx.tournamentParticipant.findMany({
        where: { tournamentId },
        select: { userId: true },
    });

    const winMap = new Map<string, number>();
    for (const participant of participants) {
        winMap.set(participant.userId, 0);
    }

    const results = await tx.matchResult.findMany({
        where: {
            match: {
                tournamentId,
                round: {
                    type: "SWISS",
                    roundNumber: { lte: currentRoundNumber },
                },
            },
        },
        select: { winnerId: true },
    });

    for (const result of results) {
        winMap.set(result.winnerId, (winMap.get(result.winnerId) ?? 0) + 1);
    }

    const ordered = participants
        .map((participant) => ({
            userId: participant.userId,
            wins: winMap.get(participant.userId) ?? 0,
        }))
        .sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.userId.localeCompare(b.userId);
        });

    const matchCount = Math.ceil(ordered.length / 2);
    const matches = await createMatches(tx, tournamentId, { id: nextRound.id, roundNumber: currentRoundNumber + 1, type: "SWISS" }, matchCount);

    for (let i = 0; i < matches.length; i += 1) {
        const playerAId = ordered[i * 2]?.userId ?? null;
        const playerBId = ordered[i * 2 + 1]?.userId ?? null;
        await assignMatchPlayers(tx, matches[i].id, playerAId, playerBId);
    }

    await createBracketNodes(tx, tournamentId);

    await tx.tournamentRound.update({
        where: { id: currentRound.id },
        data: { isActive: false, completedAt: new Date() },
    });

    await tx.tournamentRound.update({
        where: { id: nextRound.id },
        data: { isActive: true, startedAt: new Date() },
    });
}

async function persistSeeding(tx: PrismaClient, tournamentId: string, assignments: SeedAssignment[]) {
    if (assignments.length === 0) return;
    const seededAt = new Date();

    await Promise.all(assignments.map((assignment) =>
        tx.tournamentParticipant.updateMany({
            where: { tournamentId, userId: assignment.userId },
            data: {
                seed: assignment.seed,
                seededAt,
            },
        })
    ));

    await tx.auditLog.create({
        data: {
            userId: null,
            action: "TOURNAMENT_SEEDED",
            targetId: tournamentId,
            targetType: "Tournament",
            ipAddress: "0.0.0.0",
            userAgent: "bracket-engine",
            details: JSON.stringify({
                seeds: assignments,
            }),
        },
    });
}

async function createBracketNodes(tx: PrismaClient, tournamentId: string) {
    const matches = await tx.match.findMany({
        where: { tournamentId },
        select: {
            id: true,
            roundId: true,
            bracketIndex: true,
            nextMatchId: true,
            round: { select: { roundNumber: true } },
        },
    });

    if (matches.length === 0) return;

    await tx.bracketNode.createMany({
        data: matches.map((match) => ({
            tournamentId,
            matchId: match.id,
            roundId: match.roundId,
            slotIndex: match.bracketIndex,
            depth: match.round.roundNumber,
        })),
        skipDuplicates: true,
    });

    const nodes = await tx.bracketNode.findMany({
        where: { tournamentId },
        select: { id: true, matchId: true },
    });
    const nodeByMatch = new Map(nodes.map((node) => [node.matchId, node.id]));

    await Promise.all(
        matches
            .filter((match) => match.nextMatchId)
            .map((match) =>
                tx.bracketNode.updateMany({
                    where: { matchId: match.id },
                    data: { nextNodeId: nodeByMatch.get(match.nextMatchId || "") ?? null },
                })
            )
    );
}

async function generateSingleElim(tx: PrismaClient, tournamentId: string, participants: BracketParticipant[]) {
    const bracketSize = nextPowerOfTwo(participants.length);
    const { slots, assignments } = buildSeededSlots(participants, bracketSize);
    const roundsCount = Math.log2(bracketSize);

    const rounds = await createRounds(tx, tournamentId, Array.from({ length: roundsCount }, (_, i) => ({
        roundNumber: i + 1,
        type: "MAIN",
        name: `Round ${i + 1}`,
    })));
    await persistSeeding(tx, tournamentId, assignments);

    const matchesByRound: Record<number, BracketMatch[]> = {};
    for (const round of rounds) {
        const matchesCount = bracketSize / Math.pow(2, round.roundNumber);
        matchesByRound[round.roundNumber] = await createMatches(tx, tournamentId, round, matchesCount);
    }

    for (let roundNumber = 1; roundNumber < roundsCount; roundNumber += 1) {
        const currentMatches = matchesByRound[roundNumber];
        const nextMatches = matchesByRound[roundNumber + 1];
        for (let i = 0; i < currentMatches.length; i += 1) {
            const nextMatch = nextMatches[Math.floor(i / 2)];
            const nextSide: MatchPlayerSide = i % 2 === 0 ? "A" : "B";
            await tx.match.update({
                where: { id: currentMatches[i].id },
                data: {
                    nextMatchId: nextMatch.id,
                    nextMatchSide: nextSide,
                },
            });
        }
    }

    const roundOneMatches = matchesByRound[1];
    for (let i = 0; i < roundOneMatches.length; i += 1) {
        const playerAId = slots[i * 2] ?? null;
        const playerBId = slots[i * 2 + 1] ?? null;
        await assignMatchPlayers(tx, roundOneMatches[i].id, playerAId, playerBId);
    }

    await createBracketNodes(tx, tournamentId);
}

async function generateDoubleElim(tx: PrismaClient, tournamentId: string, participants: BracketParticipant[]) {
    const bracketSize = nextPowerOfTwo(participants.length);
    const { slots, assignments } = buildSeededSlots(participants, bracketSize);
    const upperRoundsCount = Math.log2(bracketSize);
    const lowerRoundsCount = Math.max(1, 2 * (upperRoundsCount - 1));

    const upperRounds = await createRounds(tx, tournamentId, Array.from({ length: upperRoundsCount }, (_, i) => ({
        roundNumber: i + 1,
        type: "UPPER",
        name: `Upper Round ${i + 1}`,
    })));

    const lowerRounds = await createRounds(tx, tournamentId, Array.from({ length: lowerRoundsCount }, (_, i) => ({
        roundNumber: i + 1,
        type: "LOWER",
        name: `Lower Round ${i + 1}`,
    })));

    const grandFinalRound = (await createRounds(tx, tournamentId, [
        { roundNumber: 1, type: "GRAND_FINAL", name: "Grand Final" },
    ]))[0];

    const upperMatches: Record<number, BracketMatch[]> = {};
    for (const round of upperRounds) {
        const matchesCount = bracketSize / Math.pow(2, round.roundNumber);
        upperMatches[round.roundNumber] = await createMatches(tx, tournamentId, round, matchesCount);
    }

    const lowerMatches: Record<number, BracketMatch[]> = {};
    for (const round of lowerRounds) {
        const exponent = Math.floor((round.roundNumber + 2) / 2) + 1;
        const matchesCount = bracketSize / Math.pow(2, exponent);
        lowerMatches[round.roundNumber] = await createMatches(tx, tournamentId, round, matchesCount);
    }

    const grandFinalMatch = (await createMatches(tx, tournamentId, grandFinalRound, 1))[0];
    await persistSeeding(tx, tournamentId, assignments);

    for (let roundNumber = 1; roundNumber < upperRoundsCount; roundNumber += 1) {
        const currentMatches = upperMatches[roundNumber];
        const nextMatches = upperMatches[roundNumber + 1];
        for (let i = 0; i < currentMatches.length; i += 1) {
            const nextMatch = nextMatches[Math.floor(i / 2)];
            const nextSide: MatchPlayerSide = i % 2 === 0 ? "A" : "B";
            const loserTargetRound = roundNumber === 1 ? 1 : 2 * roundNumber - 2;
            const loserTargetMatches = lowerMatches[loserTargetRound];
            const loserMatchIndex = roundNumber === 1 ? Math.floor(i / 2) : i;
            const loserMatch = loserTargetMatches[loserMatchIndex];
            const loserSide: MatchPlayerSide = roundNumber === 1 ? (i % 2 === 0 ? "A" : "B") : "B";

            await tx.match.update({
                where: { id: currentMatches[i].id },
                data: {
                    nextMatchId: nextMatch.id,
                    nextMatchSide: nextSide,
                    loserNextMatchId: loserMatch?.id,
                    loserNextMatchSide: loserMatch ? loserSide : null,
                },
            });
        }
    }

    const upperFinalMatches = upperMatches[upperRoundsCount];
    if (upperFinalMatches?.[0]) {
        const lowerTargetRound = lowerRoundsCount;
        const loserMatch = lowerMatches[lowerTargetRound]?.[0];
        await tx.match.update({
            where: { id: upperFinalMatches[0].id },
            data: {
                nextMatchId: grandFinalMatch.id,
                nextMatchSide: "A",
                loserNextMatchId: loserMatch?.id,
                loserNextMatchSide: loserMatch ? "B" : null,
            },
        });
    }

    for (let roundNumber = 1; roundNumber <= lowerRoundsCount; roundNumber += 1) {
        const currentMatches = lowerMatches[roundNumber];
        const nextRound = roundNumber + 1;
        if (!currentMatches || currentMatches.length === 0) continue;

        for (let i = 0; i < currentMatches.length; i += 1) {
            const currentMatch = currentMatches[i];
            if (roundNumber === lowerRoundsCount) {
                await tx.match.update({
                    where: { id: currentMatch.id },
                    data: {
                        nextMatchId: grandFinalMatch.id,
                        nextMatchSide: "B",
                    },
                });
                continue;
            }

            const nextMatches = lowerMatches[nextRound];
            if (!nextMatches) continue;
            const nextIndex = roundNumber % 2 === 1 ? i : Math.floor(i / 2);
            const nextMatch = nextMatches[nextIndex];
            const nextSide: MatchPlayerSide = roundNumber % 2 === 1 ? "A" : (i % 2 === 0 ? "A" : "B");

            await tx.match.update({
                where: { id: currentMatch.id },
                data: {
                    nextMatchId: nextMatch.id,
                    nextMatchSide: nextSide,
                },
            });
        }
    }

    const roundOneMatches = upperMatches[1];
    for (let i = 0; i < roundOneMatches.length; i += 1) {
        const playerAId = slots[i * 2] ?? null;
        const playerBId = slots[i * 2 + 1] ?? null;
        await assignMatchPlayers(tx, roundOneMatches[i].id, playerAId, playerBId);
    }

    await createBracketNodes(tx, tournamentId);
}

async function generateSwiss(tx: PrismaClient, tournamentId: string, participants: BracketParticipant[]) {
    const roundsCount = Math.max(1, Math.ceil(Math.log2(participants.length)));
    const rounds = await createRounds(tx, tournamentId, Array.from({ length: roundsCount }, (_, i) => ({
        roundNumber: i + 1,
        type: "SWISS",
        name: `Swiss Round ${i + 1}`,
    })));

    const shuffled = shuffleArray(participants);
    const roundOne = rounds[0];
    const matchCount = Math.ceil(shuffled.length / 2);
    const matches = await createMatches(tx, tournamentId, roundOne, matchCount);

    for (let i = 0; i < matches.length; i += 1) {
        const playerAId = shuffled[i * 2]?.userId ?? null;
        const playerBId = shuffled[i * 2 + 1]?.userId ?? null;
        await assignMatchPlayers(tx, matches[i].id, playerAId, playerBId);
    }

    await createBracketNodes(tx, tournamentId);
}

export async function generateTournamentBracket(prisma: PrismaClient, tournamentId: string, structure: TournamentStructure, participants: BracketParticipant[]) {
    if (participants.length < 2) {
        throw new Error("Minimal 2 peserta untuk memulai turnamen.");
    }

    await prisma.$transaction(async (tx) => {
        if (structure === "SINGLE_ELIM") {
            await generateSingleElim(tx as PrismaClient, tournamentId, participants);
            return;
        }
        if (structure === "DOUBLE_ELIM") {
            await generateDoubleElim(tx as PrismaClient, tournamentId, participants);
            return;
        }

        await generateSwiss(tx as PrismaClient, tournamentId, participants);
    });
}

export async function resolveMatchResult(prisma: PrismaClient, matchId: string, result: { scoreA: number; scoreB: number; winnerId: string; source: MatchResultSource; confirmedById?: string | null }) {
    await prisma.$transaction(async (tx) => {
        await tx.match.update({
            where: { id: matchId },
            data: {
                scoreA: result.scoreA,
                scoreB: result.scoreB,
                winnerId: result.winnerId,
                status: "COMPLETED",
                matchVersion: { increment: 1 },
            },
        });

        await tx.matchResult.upsert({
            where: { matchId },
            create: {
                matchId,
                winnerId: result.winnerId,
                scoreA: result.scoreA,
                scoreB: result.scoreB,
                source: result.source,
                confirmedById: result.confirmedById ?? null,
            },
            update: {
                winnerId: result.winnerId,
                scoreA: result.scoreA,
                scoreB: result.scoreB,
                source: result.source,
                confirmedById: result.confirmedById ?? null,
            },
        });

        await advanceWinnerAndLoser(tx as PrismaClient, matchId);

        const match = await tx.match.findUnique({
            where: { id: matchId },
            select: {
                tournamentId: true,
                round: { select: { type: true, roundNumber: true } },
            },
        });

        if (match?.round.type === "SWISS") {
            await maybeAdvanceSwissRound(tx as PrismaClient, match.tournamentId, match.round.roundNumber);
        }
    });
}
