import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { matchReportSchema } from "@/lib/validators";
import { resolveMatchResult } from "@/lib/services/tournament-bracket.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractIP, logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { getRateLimitEnabled, getRateLimitMatchReport } from "@/lib/runtime-config";
import { validateMatchScore } from "@/lib/services/match-scoring";

function reportsMatch(left: { scoreA: number; scoreB: number; winnerId: string }, right: { scoreA: number; scoreB: number; winnerId: string }) {
    return left.scoreA === right.scoreA && left.scoreB === right.scoreB && left.winnerId === right.winnerId;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const ipAddress = extractIP(request.headers);
        if (getRateLimitEnabled()) {
            const { max, windowSeconds } = getRateLimitMatchReport();
            const rate = checkRateLimit(`match-report:${currentUser.id}:${ipAddress}`, {
                windowMs: windowSeconds * 1000,
                max,
            });
            if (!rate.allowed) {
                await logAudit({
                    userId: currentUser.id,
                    action: AUDIT_ACTIONS.RATE_LIMIT_HIT,
                    targetId: id,
                    targetType: "Match",
                    details: { scope: "match_report", resetAt: new Date(rate.resetAt).toISOString() },
                });
                return NextResponse.json({ success: false, message: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
            }
        }

        const body = await request.json();
        const parsed = matchReportSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                tournament: { select: { format: true } },
                playerAId: true,
                playerBId: true,
                playerA: { select: { userId: true, status: true } },
                playerB: { select: { userId: true, status: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        if (match.status === "COMPLETED") {
            return NextResponse.json({ success: false, message: "Match sudah selesai" }, { status: 400 });
        }

        const participantUserIds = [match.playerA?.userId, match.playerB?.userId].filter(Boolean);
        if (!participantUserIds.includes(currentUser.id)) {
            return NextResponse.json({ success: false, message: "Anda bukan pemain di match ini" }, { status: 403 });
        }

        const currentParticipantStatus =
            match.playerA?.userId === currentUser.id
                ? match.playerA?.status
                : match.playerB?.userId === currentUser.id
                  ? match.playerB?.status
                  : null;
        if (currentParticipantStatus === "DISQUALIFIED") {
            return NextResponse.json({ success: false, message: "Akun kamu sudah didiskualifikasi dari turnamen ini" }, { status: 403 });
        }

        if (![match.playerAId, match.playerBId].includes(parsed.data.winnerId)) {
            return NextResponse.json({ success: false, message: "Winner ID tidak valid untuk match ini" }, { status: 400 });
        }

        const scoreError = validateMatchScore({
            scoreA: parsed.data.scoreA,
            scoreB: parsed.data.scoreB,
            winnerId: parsed.data.winnerId,
            playerAId: match.playerAId,
            playerBId: match.playerBId,
            format: match.tournament.format,
        });
        if (scoreError) {
            return NextResponse.json({ success: false, message: scoreError }, { status: 400 });
        }

        const hasEvidence = Object.prototype.hasOwnProperty.call(parsed.data, "evidenceUrls");
        const evidenceUrls = parsed.data.evidenceUrls ?? null;

        await prisma.matchReport.upsert({
            where: { matchId_reportedById: { matchId: id, reportedById: currentUser.id } },
            create: {
                matchId: id,
                reportedById: currentUser.id,
                scoreA: parsed.data.scoreA,
                scoreB: parsed.data.scoreB,
                winnerId: parsed.data.winnerId,
                ...(hasEvidence ? { evidenceUrls } : {}),
            },
            update: {
                scoreA: parsed.data.scoreA,
                scoreB: parsed.data.scoreB,
                winnerId: parsed.data.winnerId,
                ...(hasEvidence ? { evidenceUrls } : {}),
            },
        });

        const reports = await prisma.matchReport.findMany({
            where: { matchId: id },
            select: { reportedById: true, scoreA: true, scoreB: true, winnerId: true },
        });

        if (reports.length >= 2) {
            const [first, second] = reports;
            if (reportsMatch(first, second)) {
                await resolveMatchResult(prisma, id, {
                    scoreA: first.scoreA,
                    scoreB: first.scoreB,
                    winnerId: first.winnerId,
                    source: "PLAYER",
                }, {
                    actorUserId: currentUser.id,
                });
                await logAudit({
                    userId: currentUser.id,
                    action: AUDIT_ACTIONS.MATCH_CONFIRMED,
                    targetId: id,
                    targetType: "Match",
                    details: { scoreA: first.scoreA, scoreB: first.scoreB, winnerId: first.winnerId },
                });
                return NextResponse.json({ success: true, message: "Hasil match terkonfirmasi" }, { status: 200 });
            }

            await prisma.match.update({
                where: { id },
                data: { status: "DISPUTED", matchVersion: { increment: 1 } },
            });

            await prisma.matchDispute.create({
                data: {
                    matchId: id,
                    raisedById: currentUser.id,
                    status: "OPEN",
                    reason: "Perbedaan laporan skor",
                },
            });

            await logAudit({
                userId: currentUser.id,
                action: AUDIT_ACTIONS.MATCH_REPORTED,
                targetId: id,
                targetType: "Match",
                details: {
                    scoreA: parsed.data.scoreA,
                    scoreB: parsed.data.scoreB,
                    winnerId: parsed.data.winnerId,
                    status: "DISPUTED",
                },
            });

            return NextResponse.json({ success: false, message: "Laporan tidak cocok, match masuk sengketa" }, { status: 409 });
        }

        await prisma.match.update({
            where: { id },
            data: { status: "RESULT_SUBMITTED", matchVersion: { increment: 1 } },
        });

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.MATCH_REPORTED,
            targetId: id,
            targetType: "Match",
            details: {
                scoreA: parsed.data.scoreA,
                scoreB: parsed.data.scoreB,
                winnerId: parsed.data.winnerId,
                status: "RESULT_SUBMITTED",
            },
        });

        return NextResponse.json({ success: true, message: "Laporan hasil dikirim, menunggu konfirmasi lawan" }, { status: 200 });
    } catch (error) {
        console.error("[Match Report]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
