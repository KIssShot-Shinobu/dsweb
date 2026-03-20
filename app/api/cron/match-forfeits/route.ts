import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCronSecret } from "@/lib/runtime-config";
import { resolveMatchResult } from "@/lib/services/tournament-bracket.service";
import { getRequiredWinsForFormat } from "@/lib/services/match-scoring";
import { createNotificationService } from "@/lib/services/notification.service";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { stringifyDetails } from "@/lib/audit-utils";

const DEFAULT_FORFEIT_GRACE_MINUTES = 15;
const TEAM_NOTIFY_ROLES = ["CAPTAIN", "VICE_CAPTAIN", "MANAGER"] as const;

export async function POST(request: Request) {
    try {
        const secret = getCronSecret();
        if (!secret) {
            return NextResponse.json({ success: false, message: "Cron secret belum dikonfigurasi" }, { status: 500 });
        }

        const provided = request.headers.get("x-cron-secret");
        if (provided !== secret) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const matches = await prisma.match.findMany({
            where: {
                scheduledAt: { lte: now },
                status: { in: ["PENDING", "READY"] },
                playerAId: { not: null },
                playerBId: { not: null },
            },
            select: {
                id: true,
                tournamentId: true,
                scheduledAt: true,
                tournament: {
                    select: {
                        checkinRequired: true,
                        format: true,
                        forfeitEnabled: true,
                        forfeitGraceMinutes: true,
                        forfeitMode: true,
                    },
                },
                playerA: {
                    select: {
                        id: true,
                        status: true,
                        checkedInAt: true,
                        userId: true,
                        teamId: true,
                    },
                },
                playerB: {
                    select: {
                        id: true,
                        status: true,
                        checkedInAt: true,
                        userId: true,
                        teamId: true,
                    },
                },
            },
        });

        if (matches.length === 0) {
            return NextResponse.json({ success: true, forfeitedMatches: 0, notifications: 0 });
        }

        const matchIds = matches.map((match) => match.id);
        const reports = matchIds.length
            ? await prisma.matchReport.findMany({
                  where: { matchId: { in: matchIds } },
                  select: { matchId: true, reportedById: true },
              })
            : [];

        const reportsByMatch = new Map<string, Set<string>>();
        for (const report of reports) {
            const current = reportsByMatch.get(report.matchId) ?? new Set<string>();
            current.add(report.reportedById);
            reportsByMatch.set(report.matchId, current);
        }

        const teamIds = new Set<string>();
        matches.forEach((match) => {
            if (match.playerA?.teamId) teamIds.add(match.playerA.teamId);
            if (match.playerB?.teamId) teamIds.add(match.playerB.teamId);
        });

        const teamMembers = teamIds.size
            ? await prisma.teamMember.findMany({
                  where: {
                      teamId: { in: Array.from(teamIds) },
                      leftAt: null,
                      role: { in: [...TEAM_NOTIFY_ROLES] },
                  },
                  select: { userId: true, teamId: true },
              })
            : [];

        const teamRecipients = new Map<string, string[]>();
        for (const member of teamMembers) {
            const current = teamRecipients.get(member.teamId) ?? [];
            current.push(member.userId);
            teamRecipients.set(member.teamId, current);
        }

        const notifications = createNotificationService({ prisma });
        let notificationCount = 0;
        const forfeitedMatchIds: string[] = [];

        for (const match of matches) {
            if (!match.tournament.forfeitEnabled || !match.tournament.checkinRequired) continue;
            if (!match.playerA || !match.playerB) continue;
            if (match.playerA.status === "DISQUALIFIED" || match.playerB.status === "DISQUALIFIED") continue;
            if (!match.scheduledAt) continue;

            const graceMinutes = Math.max(1, match.tournament.forfeitGraceMinutes ?? DEFAULT_FORFEIT_GRACE_MINUTES);
            const cutoff = new Date(match.scheduledAt.getTime() + graceMinutes * 60 * 1000);
            if (now < cutoff) continue;

            const playerAReported =
                match.tournament.forfeitMode === "SCHEDULE_NO_SHOW" && match.playerA.userId
                    ? reportsByMatch.get(match.id)?.has(match.playerA.userId) ?? false
                    : false;
            const playerBReported =
                match.tournament.forfeitMode === "SCHEDULE_NO_SHOW" && match.playerB.userId
                    ? reportsByMatch.get(match.id)?.has(match.playerB.userId) ?? false
                    : false;

            const playerAActive = Boolean(match.playerA.checkedInAt) || playerAReported;
            const playerBActive = Boolean(match.playerB.checkedInAt) || playerBReported;
            if (playerAActive === playerBActive) continue;

            const winnerId = playerAActive ? match.playerA.id : match.playerB.id;
            const loserId = playerAActive ? match.playerB.id : match.playerA.id;
            const requiredWins = getRequiredWinsForFormat(match.tournament.format);
            const scoreA = playerAActive ? requiredWins : 0;
            const scoreB = playerAActive ? 0 : requiredWins;

            await resolveMatchResult(prisma, match.id, {
                scoreA,
                scoreB,
                winnerId,
                source: "SYSTEM",
            });

            const winner = playerAActive ? match.playerA : match.playerB;
            const loser = playerAActive ? match.playerB : match.playerA;

            const recipientSets: Array<{ ids: Set<string>; title: string; message: string }> = [
                {
                    ids: new Set<string>(),
                    title: "Menang By Forfeit",
                    message: "Lawan tidak check-in tepat waktu. Kamu menang otomatis.",
                },
                {
                    ids: new Set<string>(),
                    title: "Kalah By Forfeit",
                    message: "Kamu tidak check-in tepat waktu. Match dinyatakan kalah (forfeit).",
                },
            ];

            if (winner.userId) recipientSets[0].ids.add(winner.userId);
            if (winner.teamId) {
                (teamRecipients.get(winner.teamId) ?? []).forEach((id) => recipientSets[0].ids.add(id));
            }
            if (loser.userId) recipientSets[1].ids.add(loser.userId);
            if (loser.teamId) {
                (teamRecipients.get(loser.teamId) ?? []).forEach((id) => recipientSets[1].ids.add(id));
            }

            for (const payload of recipientSets) {
                if (payload.ids.size === 0) continue;
                try {
                    await Promise.all(
                        Array.from(payload.ids).map((userId) =>
                            notifications.createNotification({
                                userId,
                                type: "SYSTEM_ALERT",
                                title: payload.title,
                                message: payload.message,
                                link: `/tournaments/${match.tournamentId}`,
                            })
                        )
                    );
                    notificationCount += payload.ids.size;
                } catch (notifyError) {
                    console.error("[Match Forfeit Notify]", notifyError);
                }
            }

            try {
                await prisma.auditLog.create({
                    data: {
                        userId: null,
                        action: AUDIT_ACTIONS.MATCH_FORFEITED,
                        targetId: match.id,
                        targetType: "Match",
                        ipAddress: "0.0.0.0",
                        userAgent: "cron",
                        details: stringifyDetails({
                            tournamentId: match.tournamentId,
                            winnerId,
                            loserId,
                            reason: "AUTO_FORFEIT_CHECKIN",
                        }),
                    },
                });
            } catch (auditError) {
                console.error("[Match Forfeit Audit]", auditError);
            }

            forfeitedMatchIds.push(match.id);
        }

        return NextResponse.json({
            success: true,
            forfeitedMatches: forfeitedMatchIds.length,
            notifications: notificationCount,
        });
    } catch (error) {
        console.error("[Match Forfeit Cron]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
