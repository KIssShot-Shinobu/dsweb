import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
    getChangedSensitiveFields,
    protectUserWhereInput,
    protectUserWriteData,
    redactSensitiveFields,
    unprotectUserRecord,
} from "@/lib/data-protection";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    prismaPool: Pool | undefined;
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

function parseNumber(value: string | null, fallback: number) {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | null, fallback: boolean) {
    if (value === null || value === undefined) return fallback;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return fallback;
}

function shouldEnablePgSsl(databaseUrl: string) {
    try {
        const url = new URL(databaseUrl);
        const sslMode = url.searchParams.get("sslmode") ?? url.searchParams.get("ssl-mode");
        const sslValue = url.searchParams.get("ssl");
        if (sslMode && sslMode.toLowerCase() === "require") return true;
        if (sslValue && sslValue.toLowerCase() === "true") return true;
    } catch {
        // ignore parsing errors
    }
    return false;
}

function normalizePgConnectionString(databaseUrl: string) {
    try {
        const url = new URL(databaseUrl);
        const sslMode = url.searchParams.get("sslmode") ?? url.searchParams.get("ssl-mode");
        const compatFlag = url.searchParams.get("uselibpqcompat");
        if (sslMode?.toLowerCase() === "require" && !compatFlag) {
            url.searchParams.set("uselibpqcompat", "true");
            return url.toString();
        }
    } catch {
        // ignore parsing errors and keep original string
    }
    return databaseUrl;
}

function getPgPool(databaseUrl: string) {
    if (globalForPrisma.prismaPool) return globalForPrisma.prismaPool;
    const normalizedConnectionString = normalizePgConnectionString(databaseUrl);

    const pool = new Pool({
        connectionString: normalizedConnectionString,
        max: parseNumber(process.env.PRISMA_POOL_LIMIT ?? null, 10),
        connectionTimeoutMillis: parseNumber(process.env.PRISMA_POOL_ACQUIRE_TIMEOUT_MS ?? null, 10000),
        ssl: shouldEnablePgSsl(normalizedConnectionString)
            ? { rejectUnauthorized: parseBoolean(process.env.PG_SSL_REJECT_UNAUTHORIZED ?? null, true) }
            : undefined,
    });
    globalForPrisma.prismaPool = pool;
    return pool;
}

function createBasePrismaClient() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set.");
    }
    const pool = getPgPool(databaseUrl);
    return new PrismaClient({ adapter: new PrismaPg(pool) });
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
                    const resultUserId = (result as UserResultWithId)?.id ?? previous?.id;

                    if (changedFields.length > 0 && resultUserId) {
                        basePrisma.auditLog.create({
                            data: {
                                userId: resultUserId,
                                action: "SENSITIVE_FIELD_CHANGED",
                                targetId: resultUserId,
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
                    } else if (changedFields.length > 0) {
                        console.warn("[Prisma][SensitiveFieldAudit] Missing user id; audit log skipped.");
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
                    const resultUserId = (result as UserResultWithId)?.id ?? previous?.id;

                    if (changedFields.length > 0 && resultUserId) {
                        basePrisma.auditLog.create({
                            data: {
                                userId: resultUserId,
                                action: "SENSITIVE_FIELD_CHANGED",
                                targetId: resultUserId,
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
                    } else if (changedFields.length > 0) {
                        console.warn("[Prisma][SensitiveFieldAudit] Missing user id; audit log skipped.");
                    }

                    return unprotectUserRecord(result);
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
