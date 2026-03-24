import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { canAccessMatchChat } from "@/lib/match-chat";
import { matchLineupSchema } from "@/lib/validators";
import { hasRole, ROLES } from "@/lib/auth";
import { canRefereeTournament } from "@/lib/tournament-staff";
import { isLineupLocked, isValidLineupSize, normalizeLineupMemberIds } from "@/lib/match-lineup";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { resolveMatchNotificationRecipients } from "@/lib/services/match-notification";
import { createNotificationService } from "@/lib/services/notification.service";

const ADMIN_NOTIFY_ROLES = ["OFFICER", "ADMIN", "FOUNDER"] as const;

const resolveName = (user?: { username: string | null; fullName: string | null } | null) =>
    user?.username || user?.fullName || "User";

const resolveParticipantLabel = (participant?: {
    guestName: string | null;
    user: { fullName: string | null; username: string | null } | null;
}) => participant?.user?.username || participant?.user?.fullName || participant?.guestName || "TBD";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                tournamentId: true,
                playerA: { select: { userId: true, teamId: true } },
                playerB: { select: { userId: true, teamId: true } },
                tournament: { select: { lineupSize: true, isTeamTournament: true, mode: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        const allowed = await canAccessMatchChat(currentUser, {
            tournamentId: match.tournamentId,
            playerA: { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
            playerB: { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
        });
        if (!allowed) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const isTeamTournament = Boolean(match.tournament?.isTeamTournament || match.tournament?.mode !== "INDIVIDUAL");
        const lineupSize = match.tournament?.lineupSize ?? null;
        if (!isTeamTournament || !lineupSize) {
            return NextResponse.json({
                success: true,
                data: {
                    enabled: false,
                    lineupSize: null,
                    locked: false,
                    matchStatus: match.status,
                    myTeamId: null,
                    canSubmit: false,
                    canStart: false,
                    roster: [],
                    lineups: [],
                },
            });
        }

        const locked = isLineupLocked(match.status);
        const teamIds = [match.playerA?.teamId, match.playerB?.teamId].filter(Boolean) as string[];
        const myTeamId = teamIds.find((teamId) => teamId === currentUser.teamId) ?? null;

        const [membership, isReferee] = await Promise.all([
            myTeamId
                ? prisma.teamMember.findFirst({
                      where: { teamId: myTeamId, userId: currentUser.id, leftAt: null },
                      select: { role: true },
                  })
                : null,
            canRefereeTournament(currentUser.id, match.tournamentId),
        ]);

        const isStaff = hasRole(currentUser.role, ROLES.OFFICER) || isReferee;
        const canSubmit = Boolean(membership && membership.role === "CAPTAIN" && !locked);
        const canStart = !locked && match.status !== "ONGOING";
        const canViewAll = locked || isStaff;

        const lineups = await prisma.matchLineup.findMany({
            where: { matchId: id },
            select: {
                teamId: true,
                memberIds: true,
                updatedAt: true,
                team: { select: { name: true } },
                submittedBy: { select: { id: true, username: true, fullName: true } },
            },
        });

        const memberIds = new Set<string>();
        lineups.forEach((lineup) => {
            if (Array.isArray(lineup.memberIds)) {
                lineup.memberIds.forEach((memberId) => {
                    if (typeof memberId === "string") memberIds.add(memberId);
                });
            }
        });

        const users = memberIds.size
            ? await prisma.user.findMany({
                  where: { id: { in: Array.from(memberIds) } },
                  select: { id: true, username: true, fullName: true },
              })
            : [];
        const userMap = new Map(users.map((user) => [user.id, resolveName(user)]));

        const mappedLineups = lineups.map((lineup) => {
            const ids = Array.isArray(lineup.memberIds)
                ? lineup.memberIds.filter((memberId): memberId is string => typeof memberId === "string")
                : [];
            const members = ids.map((memberId) => ({
                id: memberId,
                name: userMap.get(memberId) ?? "User",
            }));

            return {
                teamId: lineup.teamId,
                teamName: lineup.team?.name ?? "Team",
                memberIds: ids,
                members,
                submittedBy: lineup.submittedBy ? { id: lineup.submittedBy.id, name: resolveName(lineup.submittedBy) } : null,
                updatedAt: lineup.updatedAt.toISOString(),
            };
        });

        const visibleLineups = canViewAll
            ? mappedLineups
            : mappedLineups.filter((lineup) => myTeamId && lineup.teamId === myTeamId);

        const roster = canSubmit
            ? await prisma.teamMember.findMany({
                  where: { teamId: myTeamId ?? "", leftAt: null },
                  select: { role: true, user: { select: { id: true, username: true, fullName: true } } },
              })
            : [];

        const rosterMembers = roster.map((member) => ({
            id: member.user.id,
            name: resolveName(member.user),
            role: member.role,
        }));

        return NextResponse.json({
            success: true,
            data: {
                enabled: true,
                lineupSize,
                locked,
                matchStatus: match.status,
                myTeamId,
                canSubmit,
                canStart,
                roster: rosterMembers,
                lineups: visibleLineups,
                opponentHidden: !canViewAll && Boolean(myTeamId),
            },
        });
    } catch (error) {
        console.error("[Match Lineup GET]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = matchLineupSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                tournamentId: true,
                playerA: { select: { teamId: true, userId: true, guestName: true, user: { select: { username: true, fullName: true } } } },
                playerB: { select: { teamId: true, userId: true, guestName: true, user: { select: { username: true, fullName: true } } } },
                tournament: { select: { lineupSize: true, isTeamTournament: true, mode: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        const isTeamTournament = Boolean(match.tournament?.isTeamTournament || match.tournament?.mode !== "INDIVIDUAL");
        const lineupSize = match.tournament?.lineupSize ?? null;
        if (!isTeamTournament || !lineupSize) {
            return NextResponse.json({ success: false, message: "Lineup tidak diaktifkan" }, { status: 400 });
        }

        if (isLineupLocked(match.status)) {
            return NextResponse.json({ success: false, message: "Lineup terkunci karena match sudah dimulai" }, { status: 409 });
        }

        const teamIds = [match.playerA?.teamId, match.playerB?.teamId].filter(Boolean) as string[];
        const myTeamId = teamIds.find((teamId) => teamId === currentUser.teamId) ?? null;
        if (!myTeamId) {
            return NextResponse.json({ success: false, message: "Anda bukan bagian dari team match ini" }, { status: 403 });
        }

        const membership = await prisma.teamMember.findFirst({
            where: { teamId: myTeamId, userId: currentUser.id, leftAt: null },
            select: { role: true },
        });
        if (!membership || membership.role !== "CAPTAIN") {
            return NextResponse.json({ success: false, message: "Hanya captain yang dapat mengirim lineup" }, { status: 403 });
        }

        const normalized = normalizeLineupMemberIds(parsed.data.memberIds);
        if (normalized.length !== parsed.data.memberIds.length) {
            return NextResponse.json({ success: false, message: "Lineup mengandung pemain duplikat" }, { status: 400 });
        }
        if (!isValidLineupSize(normalized, lineupSize)) {
            return NextResponse.json(
                { success: false, message: `Lineup harus berisi ${lineupSize} pemain` },
                { status: 400 }
            );
        }

        const validMembers = await prisma.teamMember.findMany({
            where: {
                teamId: myTeamId,
                leftAt: null,
                userId: { in: normalized },
            },
            select: { userId: true },
        });
        if (validMembers.length !== normalized.length) {
            return NextResponse.json({ success: false, message: "Pilih anggota roster yang valid" }, { status: 400 });
        }

        const existing = await prisma.matchLineup.findUnique({
            where: { matchId_teamId: { matchId: id, teamId: myTeamId } },
            select: { id: true },
        });

        const lineup = await prisma.matchLineup.upsert({
            where: { matchId_teamId: { matchId: id, teamId: myTeamId } },
            create: {
                matchId: id,
                teamId: myTeamId,
                submittedById: currentUser.id,
                memberIds: normalized,
            },
            update: {
                memberIds: normalized,
                submittedById: currentUser.id,
            },
        });

        const action = existing ? AUDIT_ACTIONS.MATCH_LINEUP_UPDATED : AUDIT_ACTIONS.MATCH_LINEUP_SUBMITTED;
        await logAudit({
            userId: currentUser.id,
            action,
            targetId: lineup.id,
            targetType: "MatchLineup",
            details: { matchId: id, teamId: myTeamId, members: normalized },
        });

        const recipients = await resolveMatchNotificationRecipients(prisma, match.tournamentId, [
            { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
            { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
        ]);
        const adminUsers = await prisma.user.findMany({
            where: { role: { in: ADMIN_NOTIFY_ROLES }, status: "ACTIVE" },
            select: { id: true },
        });
        const adminIds = adminUsers.map((user) => user.id);
        const filteredRecipients = Array.from(new Set([...recipients, ...adminIds])).filter((userId) => userId !== currentUser.id);

        if (filteredRecipients.length > 0) {
            const notifications = createNotificationService({ prisma });
            const labelA = resolveParticipantLabel(match.playerA);
            const labelB = resolveParticipantLabel(match.playerB);
            const message = `Lineup disubmit untuk match ${labelA} vs ${labelB}.`;

            try {
                await Promise.all(
                    filteredRecipients.map((userId) =>
                        notifications.createNotification({
                            userId,
                            type: "SYSTEM_ALERT",
                            title: "Lineup Match",
                            message,
                            link: `/tournaments/${match.tournamentId}`,
                        })
                    )
                );
            } catch (notifyError) {
                console.error("[Match Lineup Notify]", notifyError);
            }
        }

        return NextResponse.json({ success: true, message: "Lineup berhasil disimpan." }, { status: 200 });
    } catch (error) {
        console.error("[Match Lineup POST]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
