import { Prisma, type PrismaClient, type NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/notification-realtime";

type NotificationServiceDeps = {
    prisma: PrismaClient;
    publish?: typeof publishNotification;
};

type CreateNotificationInput = {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
};

export class NotificationServiceError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "NotificationServiceError";
        this.status = status;
    }
}

const notificationSelect = {
    id: true,
    userId: true,
    type: true,
    title: true,
    message: true,
    link: true,
    isRead: true,
    createdAt: true,
} satisfies Prisma.NotificationSelect;

function isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function createNotificationService(deps: NotificationServiceDeps = { prisma }) {
    const publish = deps.publish ?? publishNotification;

    return {
        async createNotification(input: CreateNotificationInput) {
            const preference = await deps.prisma.notificationPreference.findUnique({
                where: { userId: input.userId },
                select: { inApp: true },
            });

            if (preference && !preference.inApp) {
                return null;
            }

            try {
                const notification = await deps.prisma.notification.create({
                    data: {
                        userId: input.userId,
                        type: input.type,
                        title: input.title,
                        message: input.message,
                        link: input.link ?? null,
                    },
                    select: notificationSelect,
                });

                publish(input.userId, {
                    ...notification,
                    createdAt: notification.createdAt.toISOString(),
                });

                return notification;
            } catch (error) {
                if (isUniqueConstraintError(error)) {
                    throw new NotificationServiceError(409, "Notification conflict");
                }

                throw error;
            }
        },

        async getUserNotifications(userId: string, options?: { page?: number; limit?: number }) {
            const page = options?.page ?? 1;
            const limit = options?.limit ?? 20;

            const [notifications, total] = await Promise.all([
                deps.prisma.notification.findMany({
                    where: { userId },
                    select: notificationSelect,
                    orderBy: { createdAt: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                deps.prisma.notification.count({ where: { userId } }),
            ]);

            return { notifications, total, page, limit };
        },

        async getUnreadCount(userId: string) {
            return deps.prisma.notification.count({
                where: { userId, isRead: false },
            });
        },

        async markAsRead(userId: string, notificationId: string) {
            const existing = await deps.prisma.notification.findFirst({
                where: { id: notificationId, userId },
                select: { id: true },
            });

            if (!existing) {
                throw new NotificationServiceError(404, "Notification tidak ditemukan");
            }

            return deps.prisma.notification.update({
                where: { id: notificationId },
                data: { isRead: true },
                select: notificationSelect,
            });
        },

        async markAllAsRead(userId: string) {
            const result = await deps.prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true },
            });

            return result.count;
        },

        async deleteNotification(userId: string, notificationId: string) {
            const existing = await deps.prisma.notification.findFirst({
                where: { id: notificationId, userId },
                select: { id: true },
            });

            if (!existing) {
                throw new NotificationServiceError(404, "Notification tidak ditemukan");
            }

            await deps.prisma.notification.delete({
                where: { id: notificationId },
            });

            return true;
        },
    };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
