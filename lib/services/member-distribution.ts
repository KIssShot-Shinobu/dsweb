import type { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { normalizeRegionName, resolveGeocode } from "@/lib/geocode-id";
import { resolveCountryGeocode } from "@/lib/geocode-world";

export type MemberDistributionItem = {
    id: string;
    username: string;
    province: string | null;
    city: string | null;
    country?: string | null;
    latitude: number;
    longitude: number;
    memberCount?: number;
};

export type MemberDistributionStats = {
    totalMembers: number;
    topCities: Array<{ name: string; count: number }>;
    topProvince: { name: string; count: number } | null;
};

type DistributionUserRecord = {
    id: string;
    username: string;
    provinceName: string | null;
    city: string | null;
    countryCode: string | null;
    countryName: string | null;
    role: UserRole;
    status: UserStatus;
    avatarUrl: string | null;
    createdAt: Date;
    lastActiveAt: Date;
};

type DistributionGroup = {
    key: string;
    city: string | null;
    province: string | null;
    country: string | null;
    countryCode: string | null;
    usernames: string[];
    count: number;
};

function buildGroupKey(city: string | null, province: string | null, countryCode: string | null) {
    const normalizedCode = countryCode ? countryCode.toUpperCase() : null;
    if (normalizedCode && normalizedCode !== "ID") {
        return `COUNTRY:${normalizedCode}`;
    }
    if (!city && !province && !normalizedCode) {
        return "INTERNATIONAL";
    }
    if (city) {
        return `CITY:${normalizeRegionName(city)}`;
    }
    if (province) {
        return `PROVINCE:${normalizeRegionName(province)}`;
    }
    return `COUNTRY:${normalizedCode || "ID"}`;
}

function pickRepresentativeUsername(usernames: string[]) {
    if (usernames.length === 0) return "Member";
    return [...usernames].sort((a, b) => a.localeCompare(b, "id")).at(0) ?? "Member";
}

export function buildMemberDistributionFromRecords(users: DistributionUserRecord[]): MemberDistributionItem[] {
    const grouped = new Map<string, DistributionGroup>();

    for (const user of users) {
        const city = user.city?.trim() || null;
        const province = user.provinceName?.trim() || null;
        const countryCode = user.countryCode?.trim().toUpperCase() || null;
        const countryName = user.countryName?.trim() || null;
        const key = buildGroupKey(city, province, countryCode);

        const current = grouped.get(key);
        if (current) {
            current.count += 1;
            current.usernames.push(user.username);
            if (!current.city && city) current.city = city;
            if (!current.province && province) current.province = province;
            if (!current.country && countryName) current.country = countryName;
            if (!current.countryCode && countryCode) current.countryCode = countryCode;
        } else {
            grouped.set(key, {
                key,
                city,
                province,
                country: countryName,
                countryCode,
                usernames: [user.username],
                count: 1,
            });
        }
    }

    return Array.from(grouped.values()).map((group) => {
        const normalizedCode = group.countryCode ? group.countryCode.toUpperCase() : null;
        const isInternational = group.key === "INTERNATIONAL" || (normalizedCode !== null && normalizedCode !== "ID");
        const countryGeocode = isInternational
            ? resolveCountryGeocode({ code: normalizedCode, name: group.country })
            : null;
        const geocode = isInternational
            ? { latitude: countryGeocode!.latitude, longitude: countryGeocode!.longitude }
            : resolveGeocode({ city: group.city, province: group.province });

        const countryLabel = isInternational ? group.country || countryGeocode!.name : group.country || "Indonesia";
        return {
            id: group.key,
            username: pickRepresentativeUsername(group.usernames),
            province: group.province,
            city: group.city,
            country: countryLabel,
            latitude: geocode.latitude,
            longitude: geocode.longitude,
            memberCount: group.count,
        };
    });
}

export function buildMemberDistributionStats(users: DistributionUserRecord[]): MemberDistributionStats {
    const totalMembers = users.length;
    const cityCounts = new Map<string, { name: string; count: number }>();
    const provinceCounts = new Map<string, { name: string; count: number }>();

    for (const user of users) {
        const city = user.city?.trim() || null;
        const province = user.provinceName?.trim() || null;

        if (city) {
            const key = normalizeRegionName(city);
            const entry = cityCounts.get(key) ?? { name: city, count: 0 };
            entry.count += 1;
            cityCounts.set(key, entry);
        }

        if (province) {
            const key = normalizeRegionName(province);
            const entry = provinceCounts.get(key) ?? { name: province, count: 0 };
            entry.count += 1;
            provinceCounts.set(key, entry);
        }
    }

    const topCities = Array.from(cityCounts.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "id"))
        .slice(0, 5);

    const topProvince = Array.from(provinceCounts.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "id"))
        .at(0) ?? null;

    return { totalMembers, topCities, topProvince };
}

export async function buildMemberDistribution(prisma: PrismaClient) {
    const users = await prisma.user.findMany({
        where: {
            status: "ACTIVE",
            role: { in: ["MEMBER", "OFFICER", "ADMIN", "FOUNDER"] },
        },
        select: {
            id: true,
            username: true,
            provinceName: true,
            city: true,
            countryCode: true,
            countryName: true,
            role: true,
            status: true,
            avatarUrl: true,
            createdAt: true,
            lastActiveAt: true,
        },
    });

    return {
        data: buildMemberDistributionFromRecords(users),
        stats: buildMemberDistributionStats(users),
    };
}
