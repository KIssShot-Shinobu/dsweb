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

type QueryArgs = Record<string, unknown>;
type QueryRunner = (args: QueryArgs) => Promise<unknown>;
type QueryParams = { args: QueryArgs; query: QueryRunner };
type UserSensitiveSnapshot = {
    id: string;
    phoneWhatsapp: string | null;
    accountNumber: string | null;
    twoFactorSecret: string | null;
};
type UserResultWithId = { id: string };
type SessionResult = { userId: string };

function createBasePrismaClient() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set.");
    }

    const adapter = new PrismaMariaDb(databaseUrl);
    return new PrismaClient({ adapter });
}

const basePrisma = globalForPrisma.prisma ?? createBasePrismaClient();

const prismaExtension = Prisma.defineExtension((client) =>
    client.$extends({
        query: {
            user: {
                async findUnique({ args, query }: QueryParams) {
                    const result = await query({
                        ...args,
                        where: protectUserWhereInput(args.where),
                    });

                    return unprotectUserRecord(result);
                },
                async findFirst({ args, query }: QueryParams) {
                    const result = await query({
                        ...args,
                        where: protectUserWhereInput(args.where),
                    });

                    return unprotectUserRecord(result);
                },
                async findMany({ args, query }: QueryParams) {
                    const result = await query({
                        ...args,
                        where: protectUserWhereInput(args.where),
                    });

                    return unprotectUserRecord(result);
                },
                async create({ args, query }: QueryParams) {
                    const result = await query({
                        ...args,
                        data: protectUserWriteData(args.data as Record<string, unknown>),
                    });

                    return unprotectUserRecord(result);
                },
                async update({ args, query }: QueryParams) {
                    const previous = await basePrisma.user.findUnique({
                        where: protectUserWhereInput(args.where) as Prisma.UserWhereUniqueInput,
                        select: {
                            id: true,
                            phoneWhatsapp: true,
                            accountNumber: true,
                            twoFactorSecret: true,
                        },
                    }) as UserSensitiveSnapshot | null;

                    const protectedData = protectUserWriteData(args.data as Record<string, unknown>);
                    const result = await query({
                        ...args,
                        where: protectUserWhereInput(args.where),
                        data: protectedData,
                    });

                    const changedFields = getChangedSensitiveFields(previous, protectedData);
                    if (changedFields.length > 0) {
                        basePrisma.auditLog.create({
                            data: {
                                userId: (result as UserResultWithId).id,
                                action: "SENSITIVE_FIELD_CHANGED",
                                targetId: (result as UserResultWithId).id,
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
                async upsert({ args, query }: QueryParams) {
                    const previous = await basePrisma.user.findUnique({
                        where: protectUserWhereInput(args.where) as Prisma.UserWhereUniqueInput,
                        select: {
                            id: true,
                            phoneWhatsapp: true,
                            accountNumber: true,
                            twoFactorSecret: true,
                        },
                    }) as UserSensitiveSnapshot | null;

                    const result = await query({
                        ...args,
                        where: protectUserWhereInput(args.where),
                        create: protectUserWriteData(args.create as Record<string, unknown>),
                        update: protectUserWriteData(args.update as Record<string, unknown>),
                    });

                    const changedFields = getChangedSensitiveFields(
                        previous,
                        previous ? (args.update as Record<string, unknown>) : (args.create as Record<string, unknown>)
                    );

                    if (changedFields.length > 0) {
                        basePrisma.auditLog.create({
                            data: {
                                userId: (result as UserResultWithId).id,
                                action: "SENSITIVE_FIELD_CHANGED",
                                targetId: (result as UserResultWithId).id,
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
                async create({ args, query }: QueryParams) {
                    const result = await query(args);

                    await basePrisma.user.updateMany({
                        where: { id: (result as SessionResult).userId },
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
