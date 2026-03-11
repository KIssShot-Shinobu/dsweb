import type { NotificationType, PrismaClient, TeamCreationRequestStatus, TeamRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { logAudit } from "@/lib/audit-logger";
import { generateUniqueTeamSlug } from "@/lib/team-slug";
import { TeamServiceError } from "@/lib/services/team.service";
import { createNotificationService, type NotificationService } from "@/lib/services/notification.service";
import type { TeamRequestCreateInput } from "@/lib/validators";

type TeamRequestServiceDeps = {
    prisma: PrismaClient;
    audit: typeof logAudit;
    notifications?: NotificationService;
};

function cleanNullable(value?: string | null) {
    const nextValue = value?.trim();
    return nextValue ? nextValue : null;
}

function normalizeStatus(status?: string | null): TeamCreationRequestStatus | null {
    if (!status || status === "ALL") {
        return null;
    }
    return status as TeamCreationRequestStatus;
}

export function createTeamRequestService(deps: TeamRequestServiceDeps = { prisma, audit: logAudit }) {
    const db = deps.prisma;
    const audit = deps.audit;
    const notifications = deps.notifications ?? createNotificationService({ prisma: deps.prisma });

    const notificationType: NotificationType = "SYSTEM_ALERT";

    return {
        async listUserRequests(userId: string) {
            return db.teamCreationRequest.findMany({
                where: { requesterId: userId },
                orderBy: [{ createdAt: "desc" }],
                select: {
                    id: true,
                    teamName: true,
                    description: true,
                    logoUrl: true,
                    status: true,
                    rejectionReason: true,
                    createdAt: true,
                    reviewedAt: true,
                    reviewer: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                },
            });
        },

        async listRequests(status?: string | null) {
            const normalizedStatus = normalizeStatus(status);
            return db.teamCreationRequest.findMany({
                where: normalizedStatus ? { status: normalizedStatus } : {},
                orderBy: [{ createdAt: "desc" }],
                select: {
                    id: true,
                    teamName: true,
                    description: true,
                    logoUrl: true,
                    status: true,
                    rejectionReason: true,
                    createdAt: true,
                    reviewedAt: true,
                    requester: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                        },
                    },
                    reviewer: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                },
            });
        },

        async createRequest(userId: string, input: TeamRequestCreateInput) {
            const activeMembership = await db.teamMember.findFirst({
                where: { userId, leftAt: null },
                select: { id: true },
            });
            if (activeMembership) {
                throw new TeamServiceError(409, "Anda sudah memiliki team aktif.");
            }

            const pendingRequest = await db.teamCreationRequest.findFirst({
                where: { requesterId: userId, status: "PENDING" },
                select: { id: true },
            });
            if (pendingRequest) {
                throw new TeamServiceError(409, "Permintaan pembuatan team masih menunggu persetujuan.");
            }

            const request = await db.teamCreationRequest.create({
                data: {
                    requesterId: userId,
                    teamName: input.name.trim(),
                    description: cleanNullable(input.description),
                    logoUrl: cleanNullable(input.logoUrl),
                },
            });

            await audit({
                userId,
                action: AUDIT_ACTIONS.TEAM_REQUEST_CREATED,
                targetId: request.id,
                targetType: "TEAM_CREATION_REQUEST",
                details: { teamName: request.teamName },
            });

            return request;
        },

        async approveRequest(adminId: string, requestId: string) {
            return db.$transaction(async (tx) => {
                const request = await tx.teamCreationRequest.findUnique({
                    where: { id: requestId },
                });

                if (!request) {
                    throw new TeamServiceError(404, "Permintaan tidak ditemukan.");
                }

                if (request.status !== "PENDING") {
                    throw new TeamServiceError(409, "Permintaan ini sudah diproses.");
                }

                const activeMembership = await tx.teamMember.findFirst({
                    where: { userId: request.requesterId, leftAt: null },
                    select: { id: true },
                });
                if (activeMembership) {
                    throw new TeamServiceError(409, "User sudah memiliki team aktif.");
                }

                const slug = await generateUniqueTeamSlug(request.teamName, async (candidate) => {
                    const existing = await tx.team.findUnique({ where: { slug: candidate } });
                    return Boolean(existing);
                });

                const team = await tx.team.create({
                    data: {
                        name: request.teamName,
                        slug,
                        description: request.description,
                        logoUrl: request.logoUrl,
                        isActive: true,
                    },
                });

                await tx.teamMember.create({
                    data: {
                        teamId: team.id,
                        userId: request.requesterId,
                        role: "CAPTAIN" as TeamRole,
                    },
                });

                const updated = await tx.teamCreationRequest.update({
                    where: { id: request.id },
                    data: {
                        status: "APPROVED",
                        reviewedAt: new Date(),
                        reviewerId: adminId,
                    },
                });

                await audit({
                    userId: adminId,
                    action: AUDIT_ACTIONS.TEAM_REQUEST_APPROVED,
                    targetId: team.id,
                    targetType: "TEAM",
                    details: { requestId: request.id, requesterId: request.requesterId, teamName: team.name },
                });

                await notifications.createNotification({
                    userId: request.requesterId,
                    type: notificationType,
                    title: "Request team disetujui",
                    message: `Team "${team.name}" sudah dibuat dan Anda ditetapkan sebagai captain.`,
                    link: "/dashboard/team",
                });

                return { request: updated, team };
            });
        },

        async rejectRequest(adminId: string, requestId: string, reason?: string | null) {
            const request = await db.teamCreationRequest.findUnique({
                where: { id: requestId },
            });

            if (!request) {
                throw new TeamServiceError(404, "Permintaan tidak ditemukan.");
            }

            if (request.status !== "PENDING") {
                throw new TeamServiceError(409, "Permintaan ini sudah diproses.");
            }

            const updated = await db.teamCreationRequest.update({
                where: { id: requestId },
                data: {
                    status: "REJECTED",
                    rejectionReason: cleanNullable(reason),
                    reviewedAt: new Date(),
                    reviewerId: adminId,
                },
            });

            await audit({
                userId: adminId,
                action: AUDIT_ACTIONS.TEAM_REQUEST_REJECTED,
                targetId: request.id,
                targetType: "TEAM_CREATION_REQUEST",
                details: { requesterId: request.requesterId, reason: cleanNullable(reason) },
            });

            await notifications.createNotification({
                userId: request.requesterId,
                type: notificationType,
                title: "Request team ditolak",
                message: reason?.trim()
                    ? `Request team ditolak. Alasan: ${reason.trim()}`
                    : "Request team ditolak. Silakan perbaiki data lalu ajukan ulang.",
                link: "/dashboard/team",
            });

            return updated;
        },
    };
}
