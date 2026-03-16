import type { PrismaClient } from "@prisma/client";

export async function resolveGameByCodeOrId(prisma: PrismaClient, value: string) {
    if (!value) return null;
    return prisma.game.findFirst({
        where: {
            OR: [{ id: value }, { code: value }],
        },
    });
}
