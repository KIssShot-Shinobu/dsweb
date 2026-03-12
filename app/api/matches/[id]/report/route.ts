import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { matchReportSchema } from "@/lib/validators";
import { resolveMatchResult } from "@/lib/services/tournament-bracket.service";

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
                playerAId: true,
                playerBId: true,
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        if (match.status === "COMPLETED") {
            return NextResponse.json({ success: false, message: "Match sudah selesai" }, { status: 400 });
        }

        if (![match.playerAId, match.playerBId].includes(currentUser.id)) {
            return NextResponse.json({ success: false, message: "Anda bukan pemain di match ini" }, { status: 403 });
        }

        if (![match.playerAId, match.playerBId].includes(parsed.data.winnerId)) {
            return NextResponse.json({ success: false, message: "Winner ID tidak valid untuk match ini" }, { status: 400 });
        }

        await prisma.matchReport.upsert({
            where: { matchId_reportedById: { matchId: id, reportedById: currentUser.id } },
            create: {
                matchId: id,
                reportedById: currentUser.id,
                scoreA: parsed.data.scoreA,
                scoreB: parsed.data.scoreB,
                winnerId: parsed.data.winnerId,
            },
            update: {
                scoreA: parsed.data.scoreA,
                scoreB: parsed.data.scoreB,
                winnerId: parsed.data.winnerId,
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

            return NextResponse.json({ success: false, message: "Laporan tidak cocok, match masuk sengketa" }, { status: 409 });
        }

        await prisma.match.update({
            where: { id },
            data: { status: "RESULT_SUBMITTED", matchVersion: { increment: 1 } },
        });

        return NextResponse.json({ success: true, message: "Laporan hasil dikirim, menunggu konfirmasi lawan" }, { status: 200 });
    } catch (error) {
        console.error("[Match Report]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
