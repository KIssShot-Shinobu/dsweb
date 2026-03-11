import { Prisma, type PrismaClient, type TeamRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { logAudit } from "@/lib/audit-logger";
import { generateUniqueTeamSlug } from "@/lib/team-slug";
import { createTeamRepository, type TeamRepository } from "@/lib/repositories/team.repository";
import { createNotificationService, type NotificationService } from "@/lib/services/notification.service";
import {
    canAssignRole,
    canDeleteTeam,
    canEditTeamInfo,
    canInviteMembers,
    canLeaveTeam,
    canManageLineup,
    canPromoteMembers,
    canRemoveMember,
    canTransferCaptain,
} from "@/lib/permissions/team.permission";
import type {
    TeamCreateInput,
    TeamDeleteInput,
    TeamInviteDecisionInput,
    TeamInviteInput,
    TeamJoinRequestInput,
    TeamJoinRequestDecisionInput,
    TeamLeaveInput,
    TeamMemberPromoteInput,
    TeamMemberRemoveInput,
    TeamTransferCaptainInput,
    TeamUpdateInput,
} from "@/lib/validators";

type TeamServiceDeps = {
    prisma: PrismaClient;
    audit: typeof logAudit;
    notifications?: NotificationService;
};

type TeamMembershipView = {
    id: string;
    role: TeamRole;
    joinedAt: Date;
    leftAt: Date | null;
    userId: string;
    teamId: string;
    user: {
        id: string;
        username: string;
        fullName: string;
        email: string;
        avatarUrl: string | null;
        role: string;
        status: string;
    };
};

export class TeamServiceError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "TeamServiceError";
        this.status = status;
    }
}

function cleanNullable(value?: string | null) {
    const nextValue = value?.trim();
    return nextValue ? nextValue : null;
}

function mapMember(member: TeamMembershipView) {
    return {
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
        userId: member.userId,
        user: member.user,
    };
}

function sortMembers(members: TeamMembershipView[]) {
    const order: Record<TeamRole, number> = {
        CAPTAIN: 0,
        VICE_CAPTAIN: 1,
        MANAGER: 2,
        COACH: 3,
        PLAYER: 4,
    };

    return [...members].sort((left, right) => {
        const roleOrder = order[left.role] - order[right.role];
        if (roleOrder !== 0) {
            return roleOrder;
        }

        return left.user.fullName.localeCompare(right.user.fullName, "id-ID");
    });
}

function formatTeam(team: Awaited<ReturnType<TeamRepository["findTeamBySlug"]>>, viewerUserId?: string | null) {
    if (!team) {
        return null;
    }

    const memberships = sortMembers(team.memberships as TeamMembershipView[]);
    const viewerMembership = viewerUserId
        ? memberships.find((membership) => membership.userId === viewerUserId) ?? null
        : null;
    const canViewManagement = viewerMembership
        ? canInviteMembers(viewerMembership.role) || canEditTeamInfo(viewerMembership.role)
        : false;
    const captain = memberships.find((member) => member.role === "CAPTAIN") ?? null;
    const viewerInvite = viewerUserId ? team.invites.find((invite) => invite.userId === viewerUserId) ?? null : null;
    const viewerJoinRequest = viewerUserId ? team.joinRequests.find((req) => req.userId === viewerUserId) ?? null : null;

    return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        logoUrl: team.logoUrl,
        isActive: team.isActive,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        memberCount: team._count.memberships,
        captain: captain ? mapMember(captain) : null,
        viceCaptains: memberships.filter((member) => member.role === "VICE_CAPTAIN").map(mapMember),
        managers: memberships.filter((member) => member.role === "MANAGER").map(mapMember),
        coaches: memberships.filter((member) => member.role === "COACH").map(mapMember),
        players: memberships.filter((member) => member.role === "PLAYER").map(mapMember),
        members: memberships.map(mapMember),
        invites: canViewManagement ? team.invites : [],
        joinRequests: canViewManagement ? team.joinRequests : [],
        viewerMembership: viewerMembership ? mapMember(viewerMembership) : null,
        viewerHasPendingInvite: Boolean(viewerInvite),
        viewerHasPendingJoin: Boolean(viewerJoinRequest),
        permissions: viewerMembership
            ? {
                  canInvite: canInviteMembers(viewerMembership.role),
                  canEditTeam: canEditTeamInfo(viewerMembership.role),
                  canManageLineup: canManageLineup(viewerMembership.role),
                  canPromote: canPromoteMembers(viewerMembership.role),
                  canTransferCaptain: canTransferCaptain(viewerMembership.role),
                  canDelete: canDeleteTeam(viewerMembership.role),
                  canLeave: canLeaveTeam(viewerMembership.role),
              }
            : {
                  canInvite: false,
                  canEditTeam: false,
                  canManageLineup: false,
                  canPromote: false,
                  canTransferCaptain: false,
                  canDelete: false,
                  canLeave: false,
              },
    };
}

function ensureTeamExists<T>(team: T | null): T {
    if (!team) {
        throw new TeamServiceError(404, "Team tidak ditemukan");
    }

    return team;
}

function ensureMembership<T>(membership: T | null, message = "Anda bukan anggota team ini"): T {
    if (!membership) {
        throw new TeamServiceError(403, message);
    }

    return membership;
}

function ensureCanManage(actorMembership: { role: TeamRole }, allowed: boolean, message: string) {
    if (!allowed) {
        throw new TeamServiceError(403, message);
    }

    return actorMembership;
}

async function ensureNoActiveMembership(repository: TeamRepository, userId: string, message: string) {
    const existingMembership = await repository.findActiveMembershipByUserId(userId);
    if (existingMembership) {
        throw new TeamServiceError(409, message);
    }
}

async function resolveActorMembership(repository: TeamRepository, teamId: string, actorUserId: string) {
    return ensureMembership(await repository.findActiveMembershipByTeamAndUser(teamId, actorUserId));
}

function isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function createTeamService(deps: TeamServiceDeps = { prisma, audit: logAudit }) {
    const repository = createTeamRepository(deps.prisma);
    const notifications = deps.notifications ?? createNotificationService({ prisma: deps.prisma });

    return {
        async listTeams(viewerUserId?: string | null) {
            const teams = await repository.listPublicTeams();
            return teams.map((team) => formatTeam(team, viewerUserId)).filter(Boolean);
        },

        async getTeamBySlug(slug: string, viewerUserId?: string | null) {
            const team = await repository.findTeamBySlug(slug);
            return formatTeam(team, viewerUserId);
        },

        async createTeam(actorUserId: string, input: TeamCreateInput) {
            await ensureNoActiveMembership(repository, actorUserId, "Anda masih memiliki team aktif");

            try {
                const slug = await generateUniqueTeamSlug(input.name, async (candidate) => {
                    const existing = await repository.findTeamBySlug(candidate);
                    return Boolean(existing);
                });
                const team = await deps.prisma.$transaction((tx) => {
                    const txRepository = createTeamRepository(tx);
                    return txRepository.createTeamWithCaptain({
                        ...input,
                        slug,
                        description: cleanNullable(input.description),
                        logoUrl: cleanNullable(input.logoUrl),
                        captainUserId: actorUserId,
                    });
                });

                await deps.audit({
                    userId: actorUserId,
                    action: AUDIT_ACTIONS.TEAM_CREATED,
                    targetId: team.id,
                    targetType: "Team",
                    details: { teamId: team.id, slug: team.slug },
                });

                return formatTeam(team, actorUserId);
            } catch (error) {
                if (isUniqueConstraintError(error)) {
                    throw new TeamServiceError(409, "Nama atau slug team sudah digunakan");
                }

                throw error;
            }
        },

        async inviteUser(actorUserId: string, input: TeamInviteInput) {
            const team = ensureTeamExists(await repository.findTeamById(input.teamId));
            const actorMembership = await resolveActorMembership(repository, input.teamId, actorUserId);
            ensureCanManage(actorMembership, canInviteMembers(actorMembership.role), "Anda tidak boleh mengundang member");

            if (actorUserId === input.userId) {
                throw new TeamServiceError(400, "Anda tidak bisa mengundang diri sendiri");
            }

            const [targetUser, existingMembership, existingInvite] = await Promise.all([
                deps.prisma.user.findUnique({
                    where: { id: input.userId },
                    select: { id: true, fullName: true, status: true },
                }),
                repository.findActiveMembershipByUserId(input.userId),
                repository.findPendingInvite(input.teamId, input.userId),
            ]);

            if (!targetUser) {
                throw new TeamServiceError(404, "User target tidak ditemukan");
            }

            if (targetUser.status !== "ACTIVE") {
                throw new TeamServiceError(400, "Hanya user aktif yang bisa diundang");
            }

            if (existingMembership) {
                throw new TeamServiceError(409, "User sudah memiliki team aktif");
            }

            if (existingInvite) {
                throw new TeamServiceError(409, "Invite untuk user ini masih pending");
            }

            const invite = await repository.createInvite({
                teamId: input.teamId,
                userId: input.userId,
                invitedById: actorUserId,
            });

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_INVITED,
                targetId: invite.id,
                targetType: "TeamInvite",
                details: {
                    teamId: team.id,
                    invitedUserId: input.userId,
                    invitedById: actorUserId,
                },
            });

            await notifications.createNotification({
                userId: input.userId,
                type: "TEAM_INVITE",
                title: "Undangan Team",
                message: `Anda diundang ke ${team.name}.`,
                link: `/teams/${team.slug}?inviteId=${invite.id}`,
            });

            return invite;
        },

        async acceptInvite(actorUserId: string, input: TeamInviteDecisionInput) {
            const invite = await repository.findInviteById(input.inviteId);
            if (!invite || invite.status !== "PENDING") {
                throw new TeamServiceError(404, "Invite tidak ditemukan atau sudah diproses");
            }

            if (invite.userId !== actorUserId) {
                throw new TeamServiceError(403, "Invite ini bukan milik Anda");
            }

            await ensureNoActiveMembership(repository, actorUserId, "Anda masih memiliki team aktif");

            const result = await deps.prisma.$transaction(async (tx) => {
                const txRepository = createTeamRepository(tx);
                const existingMembership = await txRepository.findMembershipRecord(invite.teamId, actorUserId);

                if (existingMembership && existingMembership.leftAt === null) {
                    throw new TeamServiceError(409, "Anda sudah menjadi anggota team ini");
                }

                const membership = existingMembership
                    ? await txRepository.reactivateMembership(existingMembership.id, "PLAYER")
                    : await txRepository.createMembership({
                          teamId: invite.teamId,
                          userId: actorUserId,
                          role: "PLAYER",
                      });

                await txRepository.updateInviteStatus(invite.id, "ACCEPTED");

                const pendingJoinRequest = await txRepository.findPendingJoinRequest(invite.teamId, actorUserId);
                if (pendingJoinRequest) {
                    await txRepository.updateJoinRequestStatus(pendingJoinRequest.id, "ACCEPTED");
                }

                const team = await txRepository.findTeamById(invite.teamId);
                return { membership, team };
            });

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_INVITE_ACCEPTED,
                targetId: invite.id,
                targetType: "TeamInvite",
                details: { teamId: invite.teamId },
            });

            return formatTeam(result.team, actorUserId);
        },

        async declineInvite(actorUserId: string, input: TeamInviteDecisionInput) {
            const invite = await repository.findInviteById(input.inviteId);
            if (!invite || invite.status !== "PENDING") {
                throw new TeamServiceError(404, "Invite tidak ditemukan atau sudah diproses");
            }

            if (invite.userId !== actorUserId) {
                throw new TeamServiceError(403, "Invite ini bukan milik Anda");
            }

            const declinedInvite = await repository.updateInviteStatus(invite.id, "DECLINED");

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_INVITE_DECLINED,
                targetId: declinedInvite.id,
                targetType: "TeamInvite",
                details: { teamId: invite.teamId },
            });

            return declinedInvite;
        },

        async deleteTeam(actorUserId: string, input: TeamDeleteInput) {
            const team = ensureTeamExists(await repository.findTeamById(input.teamId));
            const actorMembership = await resolveActorMembership(repository, input.teamId, actorUserId);
            ensureCanManage(actorMembership, canDeleteTeam(actorMembership.role), "Hanya captain yang boleh menghapus team");

            if (team.memberships.length > 1) {
                throw new TeamServiceError(400, "Keluarkan semua member sebelum menghapus team");
            }

            await repository.deleteTeam(input.teamId);

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_DELETED,
                targetId: input.teamId,
                targetType: "Team",
                details: { teamId: input.teamId, slug: team.slug },
            });

            return { id: input.teamId };
        },

        async requestJoin(actorUserId: string, input: TeamJoinRequestInput) {
            const team = ensureTeamExists(await repository.findTeamById(input.teamId));

            if (!team.isActive) {
                throw new TeamServiceError(400, "Team ini sedang tidak menerima aktivitas baru");
            }

            await ensureNoActiveMembership(repository, actorUserId, "Anda masih memiliki team aktif");

            const [pendingRequest, pendingInvite] = await Promise.all([
                repository.findPendingJoinRequest(input.teamId, actorUserId),
                repository.findPendingInvite(input.teamId, actorUserId),
            ]);

            if (pendingInvite) {
                throw new TeamServiceError(409, "Anda sudah memiliki invite aktif untuk team ini");
            }

            if (pendingRequest) {
                throw new TeamServiceError(409, "Permintaan bergabung masih pending");
            }

            const request = await repository.createJoinRequest({
                teamId: input.teamId,
                userId: actorUserId,
            });

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_JOIN_REQUESTED,
                targetId: request.id,
                targetType: "TeamJoinRequest",
                details: { teamId: input.teamId },
            });

            const recipients = team.memberships
                .filter((membership) => ["CAPTAIN", "VICE_CAPTAIN", "MANAGER"].includes(membership.role))
                .map((membership) => membership.userId);

            await Promise.all(
                Array.from(new Set(recipients)).map((recipientId) =>
                    notifications.createNotification({
                        userId: recipientId,
                        type: "TEAM_JOIN_REQUEST",
                        title: "Permintaan Join Team",
                        message: `Ada permintaan bergabung ke ${team.name}.`,
                        link: `/dashboard/team`,
                    })
                )
            );

            return request;
        },

        async acceptJoinRequest(actorUserId: string, input: TeamJoinRequestDecisionInput) {
            const joinRequest = await repository.findJoinRequestById(input.joinRequestId);
            if (!joinRequest || joinRequest.status !== "PENDING") {
                throw new TeamServiceError(404, "Request join tidak ditemukan atau sudah diproses");
            }

            const actorMembership = await resolveActorMembership(repository, joinRequest.teamId, actorUserId);
            ensureCanManage(actorMembership, canInviteMembers(actorMembership.role), "Anda tidak boleh menerima request join");

            const targetUser = await deps.prisma.user.findUnique({
                where: { id: joinRequest.userId },
                select: { id: true, status: true },
            });

            if (!targetUser) {
                throw new TeamServiceError(404, "User target tidak ditemukan");
            }

            if (targetUser.status !== "ACTIVE") {
                throw new TeamServiceError(400, "Hanya user aktif yang bisa diterima");
            }

            await ensureNoActiveMembership(repository, joinRequest.userId, "User sudah memiliki team aktif");

            const result = await deps.prisma.$transaction(async (tx) => {
                const txRepository = createTeamRepository(tx);
                const existingMembership = await txRepository.findMembershipRecord(joinRequest.teamId, joinRequest.userId);

                if (existingMembership && existingMembership.leftAt === null) {
                    throw new TeamServiceError(409, "User sudah menjadi member team ini");
                }

                const membership = existingMembership
                    ? await txRepository.reactivateMembership(existingMembership.id, "PLAYER")
                    : await txRepository.createMembership({
                          teamId: joinRequest.teamId,
                          userId: joinRequest.userId,
                          role: "PLAYER",
                      });

                const updatedRequest = await txRepository.updateJoinRequestStatus(joinRequest.id, "ACCEPTED");
                const team = await txRepository.findTeamById(joinRequest.teamId);
                return { membership, updatedRequest, team };
            });

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_JOIN_REQUEST_ACCEPTED,
                targetId: joinRequest.id,
                targetType: "TeamJoinRequest",
                details: { teamId: joinRequest.teamId, userId: joinRequest.userId },
            });

            const teamName = result.team?.name ?? "team";
            const teamSlug = result.team?.slug;
            await notifications.createNotification({
                userId: joinRequest.userId,
                type: "SYSTEM_ALERT",
                title: "Request Join Disetujui",
                message: `Request join Anda telah disetujui. Selamat bergabung di ${teamName}.`,
                link: teamSlug ? `/teams/${teamSlug}` : "/dashboard/team",
            });

            return formatTeam(result.team, actorUserId);
        },

        async rejectJoinRequest(actorUserId: string, input: TeamJoinRequestDecisionInput) {
            const joinRequest = await repository.findJoinRequestById(input.joinRequestId);
            if (!joinRequest || joinRequest.status !== "PENDING") {
                throw new TeamServiceError(404, "Request join tidak ditemukan atau sudah diproses");
            }

            const actorMembership = await resolveActorMembership(repository, joinRequest.teamId, actorUserId);
            ensureCanManage(actorMembership, canInviteMembers(actorMembership.role), "Anda tidak boleh menolak request join");

            const rejectedRequest = await repository.updateJoinRequestStatus(joinRequest.id, "DECLINED");
            const team = await repository.findTeamById(joinRequest.teamId);

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_JOIN_REQUEST_REJECTED,
                targetId: joinRequest.id,
                targetType: "TeamJoinRequest",
                details: { teamId: joinRequest.teamId, userId: joinRequest.userId },
            });

            await notifications.createNotification({
                userId: joinRequest.userId,
                type: "SYSTEM_ALERT",
                title: "Request Join Ditolak",
                message: "Maaf, request join Anda ditolak oleh pengurus team.",
                link: team?.slug ? `/teams/${team.slug}` : "/teams",
            });

            return rejectedRequest;
        },

        async removeMember(actorUserId: string, input: TeamMemberRemoveInput) {
            const actorMembership = await resolveActorMembership(repository, input.teamId, actorUserId);
            const team = ensureTeamExists(await repository.findTeamById(input.teamId));
            const targetMembership = ensureMembership(
                await repository.findActiveMemberById(input.memberId),
                "Member target tidak ditemukan"
            );

            if (targetMembership.teamId !== input.teamId) {
                throw new TeamServiceError(400, "Member target bukan bagian dari team ini");
            }

            if (targetMembership.userId === actorUserId) {
                throw new TeamServiceError(400, "Gunakan endpoint leave untuk keluar dari team");
            }

            ensureCanManage(
                actorMembership,
                canRemoveMember(actorMembership.role, targetMembership.role),
                "Anda tidak boleh mengeluarkan member ini"
            );

            const removedMembership = await repository.markMembershipLeft(targetMembership.id);

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_MEMBER_REMOVED,
                targetId: removedMembership.id,
                targetType: "TeamMember",
                details: {
                    teamId: input.teamId,
                    removedUserId: targetMembership.userId,
                },
            });

            await notifications.createNotification({
                userId: targetMembership.userId,
                type: "TEAM_MEMBER_REMOVED",
                title: "Dikeluarkan dari Team",
                message: `Anda telah dikeluarkan dari ${team.name}.`,
                link: `/teams/${team.slug}`,
            });

            return removedMembership;
        },

        async promoteMember(actorUserId: string, input: TeamMemberPromoteInput) {
            const actorMembership = await resolveActorMembership(repository, input.teamId, actorUserId);
            ensureCanManage(actorMembership, canPromoteMembers(actorMembership.role), "Hanya captain yang bisa mengubah role member");
            const team = ensureTeamExists(await repository.findTeamById(input.teamId));

            const targetMembership = ensureMembership(
                await repository.findActiveMemberById(input.memberId),
                "Member target tidak ditemukan"
            );

            if (targetMembership.teamId !== input.teamId) {
                throw new TeamServiceError(400, "Member target bukan bagian dari team ini");
            }

            ensureCanManage(
                actorMembership,
                canAssignRole(actorMembership.role, input.role, targetMembership.role),
                "Role target tidak boleh diubah"
            );

            const updatedMembership = await repository.updateMemberRole(input.memberId, input.role);

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_ROLE_CHANGED,
                targetId: updatedMembership.id,
                targetType: "TeamMember",
                details: {
                    teamId: input.teamId,
                    userId: updatedMembership.userId,
                    role: input.role,
                },
            });

            await notifications.createNotification({
                userId: updatedMembership.userId,
                type: "TEAM_ROLE_CHANGED",
                title: "Role Team Diperbarui",
                message: `Role Anda di ${team.name} berubah menjadi ${input.role}.`,
                link: `/teams/${team.slug}`,
            });

            return updatedMembership;
        },

        async transferCaptain(actorUserId: string, input: TeamTransferCaptainInput) {
            const actorMembership = await resolveActorMembership(repository, input.teamId, actorUserId);
            ensureCanManage(actorMembership, canTransferCaptain(actorMembership.role), "Hanya captain yang bisa mentransfer captain");

            const targetMembership = ensureMembership(
                await repository.findActiveMemberById(input.memberId),
                "Member target tidak ditemukan"
            );

            if (targetMembership.teamId !== input.teamId) {
                throw new TeamServiceError(400, "Member target bukan bagian dari team ini");
            }

            if (targetMembership.role === "CAPTAIN") {
                throw new TeamServiceError(400, "Member tersebut sudah menjadi captain");
            }

            const team = await deps.prisma.$transaction(async (tx) => {
                const txRepository = createTeamRepository(tx);
                await txRepository.updateMemberRole(actorMembership.id, "VICE_CAPTAIN");
                await txRepository.updateMemberRole(targetMembership.id, "CAPTAIN");
                return txRepository.findTeamById(input.teamId);
            });

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_CAPTAIN_TRANSFERRED,
                targetId: input.memberId,
                targetType: "TeamMember",
                details: {
                    teamId: input.teamId,
                    oldCaptainUserId: actorUserId,
                    newCaptainUserId: targetMembership.userId,
                },
            });

            await notifications.createNotification({
                userId: targetMembership.userId,
                type: "TEAM_ROLE_CHANGED",
                title: "Anda Menjadi Captain",
                message: "Captain team telah ditransfer kepada Anda.",
                link: `/dashboard/team`,
            });

            return formatTeam(team, actorUserId);
        },

        async leaveTeam(actorUserId: string, input: TeamLeaveInput) {
            const membership = await resolveActorMembership(repository, input.teamId, actorUserId);
            ensureCanManage(membership, canLeaveTeam(membership.role), "Captain harus mentransfer captain terlebih dahulu");

            const leftMembership = await repository.markMembershipLeft(membership.id);

            await deps.audit({
                userId: actorUserId,
                action: AUDIT_ACTIONS.TEAM_LEFT,
                targetId: leftMembership.id,
                targetType: "TeamMember",
                details: { teamId: input.teamId },
            });

            return leftMembership;
        },

        async updateTeam(actorUserId: string, teamId: string, input: TeamUpdateInput) {
            const actorMembership = await resolveActorMembership(repository, teamId, actorUserId);
            ensureCanManage(actorMembership, canEditTeamInfo(actorMembership.role), "Anda tidak boleh mengubah informasi team");

            try {
                const team = await repository.updateTeam(teamId, {
                    ...(typeof input.name === "string" ? { name: input.name } : {}),
                    ...(typeof input.description !== "undefined" ? { description: cleanNullable(input.description) } : {}),
                    ...(typeof input.logoUrl !== "undefined" ? { logoUrl: cleanNullable(input.logoUrl) } : {}),
                });

                await deps.audit({
                    userId: actorUserId,
                    action: AUDIT_ACTIONS.TEAM_UPDATED,
                    targetId: team.id,
                    targetType: "Team",
                    details: { teamId: team.id },
                });

                return formatTeam(team, actorUserId);
            } catch (error) {
                if (isUniqueConstraintError(error)) {
                    throw new TeamServiceError(409, "Nama atau slug team sudah digunakan");
                }

                throw error;
            }
        },
    };
}

export type TeamService = ReturnType<typeof createTeamService>;
