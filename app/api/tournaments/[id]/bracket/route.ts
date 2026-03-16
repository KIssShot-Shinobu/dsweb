import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";

function mapState(status: string) {
    if (status === "COMPLETED" || status === "CONFIRMED") return "DONE";
    if (status === "ONGOING") return "IN_PROGRESS";
    if (status === "RESULT_SUBMITTED" || status === "DISPUTED") return "IN_PROGRESS";
    return "SCHEDULED";
}

function sortRoundOrder(type: string) {
    if (type === "UPPER") return 1;
    if (type === "LOWER") return 2;
    if (type === "GRAND_FINAL") return 3;
    if (type === "SWISS") return 4;
    return 0;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        const canViewInternal = Boolean(currentUser && hasRole(currentUser.role, ROLES.OFFICER));
        const { id } = await params;
        const resolveParticipantName = (participant?: { guestName: string | null; user?: { fullName: string | null; username: string | null } | null }) => {
            if (!participant) return "TBD";
            return participant.user?.fullName || participant.user?.username || participant.guestName || "TBD";
        };
        const rounds = await prisma.tournamentRound.findMany({
            where: { tournamentId: id },
            orderBy: [{ roundNumber: "asc" }],
            include: {
                matches: {
                    orderBy: { bracketIndex: "asc" },
                    include: {
                        playerA: { select: { id: true, guestName: true, user: { select: { fullName: true, username: true } } } },
                        playerB: { select: { id: true, guestName: true, user: { select: { fullName: true, username: true } } } },
                        winner: { select: { id: true } },
                    },
                },
            },
        });

        if (rounds.length === 0) {
            return NextResponse.json({ success: true, rounds: [] }, { status: 200 });
        }

        const normalizedRounds = rounds
            .sort((a, b) => {
                const typeOrder = sortRoundOrder(a.type) - sortRoundOrder(b.type);
                if (typeOrder !== 0) return typeOrder;
                return a.roundNumber - b.roundNumber;
            })
            .map((round) => ({
                id: round.id,
                name: round.name || `Round ${round.roundNumber}`,
                roundType: round.type,
                roundNumber: round.roundNumber,
                matches: round.matches.map((match) => {
                    const winnerId = match.winner?.id ?? null;
                    const base = {
                        id: match.id,
                        name: `Match ${match.bracketIndex}`,
                        nextMatchId: match.nextMatchId,
                        nextLooserMatchId: match.loserNextMatchId ?? undefined,
                        status: match.status,
                        scoreA: match.scoreA,
                        scoreB: match.scoreB,
                        tournamentRoundId: round.id,
                        startTime: match.scheduledAt?.toISOString() ?? undefined,
                        state: mapState(match.status),
                        participants: [
                            {
                                id: canViewInternal
                                    ? match.playerA?.id ?? undefined
                                    : match.playerA
                                      ? `${match.id}-A`
                                      : undefined,
                                name: resolveParticipantName(match.playerA),
                                resultText: match.scoreA?.toString() ?? "",
                                isWinner: Boolean(winnerId && winnerId === match.playerA?.id),
                            },
                            {
                                id: canViewInternal
                                    ? match.playerB?.id ?? undefined
                                    : match.playerB
                                      ? `${match.id}-B`
                                      : undefined,
                                name: resolveParticipantName(match.playerB),
                                resultText: match.scoreB?.toString() ?? "",
                                isWinner: Boolean(winnerId && winnerId === match.playerB?.id),
                            },
                        ],
                    };

                    if (!canViewInternal) {
                        return base;
                    }

                    return {
                        ...base,
                        playerAId: match.playerA?.id ?? null,
                        playerBId: match.playerB?.id ?? null,
                        winnerId,
                    };
                }),
            }));

        return NextResponse.json({ success: true, rounds: normalizedRounds }, { status: 200 });
    } catch (error) {
        console.error("[Tournament Bracket]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
