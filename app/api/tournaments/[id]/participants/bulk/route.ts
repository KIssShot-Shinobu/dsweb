import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentParticipantAddSchema, tournamentParticipantBulkSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { syncOrCreateTournamentBracket } from "@/lib/services/tournament-bracket.service";

type BulkResult = {
    added: number;
    waitlisted: number;
    skipped: number;
    failed: Array<{ line: string; reason: string }>;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                createdById: true,
                title: true,
                maxPlayers: true,
                mode: true,
                isTeamTournament: true,
                _count: { select: { participants: true } },
            },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (!hasRole(currentUser.role, ROLES.OFFICER) && currentUser.id !== tournament.createdById) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        if (tournament.status !== "OPEN") {
            return NextResponse.json({ success: false, message: "Pendaftaran turnamen sudah ditutup" }, { status: 400 });
        }

        const isTeamTournament = tournament.isTeamTournament || tournament.mode !== "INDIVIDUAL";
        if (isTeamTournament) {
            return NextResponse.json({ success: false, message: "Turnamen team tidak menerima bulk add." }, { status: 400 });
        }

        const body = await request.json();
        const parsed = tournamentParticipantBulkSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Data bulk tidak valid" }, { status: 400 });
        }

        const rows = parsed.data.text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (rows.length === 0) {
            return NextResponse.json({ success: false, message: "Tidak ada data peserta" }, { status: 400 });
        }

        const existingGuests = await prisma.tournamentParticipant.findMany({
            where: { tournamentId: id, guestName: { not: null } },
            select: { guestName: true },
        });
        const existingSet = new Set(existingGuests.map((item) => item.guestName?.toLowerCase() ?? ""));
        const seen = new Set<string>();
        const toCreate: Array<{ tournamentId: string; guestName: string; gameId: string; status: "REGISTERED" | "WAITLIST" }> = [];
        const result: BulkResult = { added: 0, waitlisted: 0, skipped: 0, failed: [] };
        const activeCount = await prisma.tournamentParticipant.count({
            where: {
                tournamentId: id,
                status: { in: ["REGISTERED", "CHECKED_IN", "PLAYING"] },
            },
        });
        let remainingSlots =
            tournament.maxPlayers !== null && tournament.maxPlayers !== undefined
                ? Math.max(0, tournament.maxPlayers - activeCount)
                : Number.POSITIVE_INFINITY;

        for (const line of rows) {
            const [rawName, rawGameId] = line.split("|").map((part) => part?.trim());
            if (!rawName || !rawGameId) {
                result.failed.push({ line, reason: "Format harus: Nama | Game ID" });
                continue;
            }

            const normalizedName = rawName.toLowerCase();
            if (existingSet.has(normalizedName) || seen.has(normalizedName)) {
                result.skipped += 1;
                continue;
            }

            const validation = tournamentParticipantAddSchema.safeParse({
                guestName: rawName,
                gameId: rawGameId,
            });

            if (!validation.success) {
                result.failed.push({ line, reason: validation.error.issues[0]?.message || "Data tidak valid" });
                continue;
            }

            seen.add(normalizedName);
            const status = remainingSlots > 0 ? "REGISTERED" : "WAITLIST";
            toCreate.push({ tournamentId: id, guestName: rawName, gameId: rawGameId, status });
            if (status === "REGISTERED") {
                remainingSlots = remainingSlots === Number.POSITIVE_INFINITY ? remainingSlots : remainingSlots - 1;
            }
        }

        if (toCreate.length > 0) {
            const created = await prisma.tournamentParticipant.createMany({
                data: toCreate,
                skipDuplicates: true,
            });
            result.added = created.count;
            result.skipped += toCreate.length - created.count;
        }

        const syncedParticipants = toCreate.length
            ? await prisma.tournamentParticipant.findMany({
                  where: {
                      tournamentId: id,
                      guestName: { in: toCreate.filter((item) => item.status === "REGISTERED").map((item) => item.guestName) },
                  },
                  select: { id: true },
              })
            : [];
        const syncResult = syncedParticipants.length
            ? await syncOrCreateTournamentBracket(
                  prisma,
                  id,
                  syncedParticipants.map((participant) => participant.id)
              )
            : { created: false, syncedCount: 0, pendingCount: 0 };

        result.waitlisted = toCreate.filter((item) => item.status === "WAITLIST").length;

        await logAudit({
            userId: currentUser.id,
            action: AUDIT_ACTIONS.TOURNAMENT_REGISTERED,
            targetId: id,
            targetType: "Tournament",
            details: {
                bulkAdded: result.added,
                bulkWaitlisted: result.waitlisted,
                bulkSkipped: result.skipped,
                bulkFailed: result.failed.length,
                tournamentTitle: tournament.title,
            },
        });

        return NextResponse.json({ success: true, result, ...syncResult }, { status: 201 });
    } catch (error) {
        console.error("[Tournament Participants Bulk]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
