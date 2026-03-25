import type { Locale } from "@/lib/i18n/locales";
import { getIntlLocale } from "@/lib/i18n/format";

type TreasuryWhereOptions = {
    ignoreMonth?: boolean;
    ignoreSearch?: boolean;
};

export function buildTreasuryWhere(searchParams: URLSearchParams, options: TreasuryWhereOptions = {}) {
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const method = searchParams.get("method");
    const status = searchParams.get("status");
    const search = (searchParams.get("search") || "").trim();

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;

    const hasMonth = month && month !== "ALL";
    const hasYear = year && year !== "ALL";

    if (!options.ignoreMonth && hasMonth && hasYear) {
        const parsedMonth = parseInt(month!, 10);
        const parsedYear = parseInt(year!, 10);
        if (!isNaN(parsedMonth) && !isNaN(parsedYear)) {
            where.createdAt = {
                gte: new Date(parsedYear, parsedMonth - 1, 1),
                lt: new Date(parsedYear, parsedMonth, 1),
            };
        }
    } else if (options.ignoreMonth && hasYear) {
        const parsedYear = parseInt(year!, 10);
        if (!isNaN(parsedYear)) {
            where.createdAt = {
                gte: new Date(parsedYear, 0, 1),
                lt: new Date(parsedYear + 1, 0, 1),
            };
        }
    }

    if (category && category !== "ALL") where.category = category;
    if (method && method !== "ALL") where.method = method;
    if (status && status !== "ALL") where.status = status;

    if (type === "MASUK") {
        where.amount = { gt: 0 };
    } else if (type === "KELUAR") {
        where.amount = { lt: 0 };
    }

    if (search && !options.ignoreSearch) {
        where.OR = [
            { description: { contains: search } },
            { counterparty: { contains: search } },
            { referenceCode: { contains: search } },
        ];
    }

    return where;
}

export function buildMonthlyBuckets(year: number, locale: Locale) {
    const intlLocale = getIntlLocale(locale);
    return Array.from({ length: 12 }, (_, index) => {
        const date = new Date(year, index, 1);
        return {
            label: date.toLocaleString(intlLocale, { month: "short" }),
            income: 0,
            expense: 0,
        };
    });
}
