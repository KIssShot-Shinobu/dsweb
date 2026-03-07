import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
    getChangedSensitiveFields,
    protectUserWhereInput,
    protectUserWriteData,
    redactSensitiveFields,
    unprotectUserRecord,
} from "@/lib/data-protection";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createBasePrismaClient() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set.");
    }

    const adapter = new PrismaMariaDb(databaseUrl);
    return new PrismaClient({ adapter });
}

const basePrisma = globalForPrisma.prisma ?? createBasePrismaClient();

const prismaExtension = Prisma.defineExtension((client: any) =>
    client.$extends({
        query: {
            user: {
                async findUnique({ args, query }: { args: any; query: any }) {
                    const result = await query({
                        ...args,
                        where: protectUserWhereInput((args as any).where),
                    });

                    return unprotectUserRecord(result);
                },
                async findFirst({ args, query }: { args: any; query: any }) {
                    const result = await query({
                        ...args,
                        where: protectUserWhereInput((args as any).where),
                    });

                    return unprotectUserRecord(result);
                },
                async findMany({ args, query }: { args: any; query: any }) {
                    const result = await query({
                        ...args,
                        where: protectUserWhereInput((args as any).where),
                    });

                    return unprotectUserRecord(result);
                },
                async create({ args, query }: { args: any; query: any }) {
                    const result = await query({
                        ...args,
                        data: protectUserWriteData((args as any).data),
                    } as any);

                    return unprotectUserRecord(result);
                },
                async update({ args, query }: { args: any; query: any }) {
                    const previous = await basePrisma.user.findUnique({
                        where: protectUserWhereInput((args as any).where) as any,
                        select: {
                            id: true,
                            phoneWhatsapp: true,
                            accountNumber: true,
                            twoFactorSecret: true,
                        } as any,
                    });

                    const protectedData = protectUserWriteData((args as any).data);
                    const result = await query({
                        ...args,
                        where: protectUserWhereInput((args as any).where),
                        data: protectedData,
                    } as any);

                    const changedFields = getChangedSensitiveFields(previous, protectedData);
                    if (changedFields.length > 0) {
                        basePrisma.auditLog.create({
                            data: {
                                userId: (result as any).id,
                                action: "SENSITIVE_FIELD_CHANGED",
                                targetId: (result as any).id,
                                targetType: "User",
                                ipAddress: "127.0.0.1",
                                userAgent: "prisma-extension",
                                details: JSON.stringify(redactSensitiveFields({
                                    model: "User",
                                    fields: changedFields,
                                })),
                            },
                        }).catch((error) => {
                            console.error("[Prisma][SensitiveFieldAudit]", error);
                        });
                    }

                    return unprotectUserRecord(result);
                },
                async upsert({ args, query }: { args: any; query: any }) {
                    const previous = await basePrisma.user.findUnique({
                        where: protectUserWhereInput((args as any).where) as any,
                        select: {
                            id: true,
                            phoneWhatsapp: true,
                            accountNumber: true,
                            twoFactorSecret: true,
                        } as any,
                    });

                    const result = await query({
                        ...args,
                        where: protectUserWhereInput((args as any).where),
                        create: protectUserWriteData((args as any).create),
                        update: protectUserWriteData((args as any).update),
                    } as any);

                    const changedFields = getChangedSensitiveFields(
                        previous,
                        previous ? ((args as any).update as Record<string, unknown>) : ((args as any).create as Record<string, unknown>)
                    );

                    if (changedFields.length > 0) {
                        basePrisma.auditLog.create({
                            data: {
                                userId: (result as any).id,
                                action: "SENSITIVE_FIELD_CHANGED",
                                targetId: (result as any).id,
                                targetType: "User",
                                ipAddress: "127.0.0.1",
                                userAgent: "prisma-extension",
                                details: JSON.stringify(redactSensitiveFields({
                                    model: "User",
                                    fields: changedFields,
                                })),
                            },
                        }).catch((error) => {
                            console.error("[Prisma][SensitiveFieldAudit]", error);
                        });
                    }

                    return unprotectUserRecord(result);
                },
            },
            session: {
                async create({ args, query }: { args: any; query: any }) {
                    const result = await query(args);

                    await basePrisma.user.updateMany({
                        where: { id: (result as any).userId },
                        data: { lastActiveAt: new Date() },
                    });

                    return result;
                },
            },
        },
    })
);

export const prisma = basePrisma.$extends(prismaExtension) as PrismaClient;

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = basePrisma;
}

export async function touchUserLastActiveAt(userId: string) {
    await basePrisma.user.updateMany({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
    });
}

export default prisma;
