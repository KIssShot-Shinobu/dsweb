import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRegionName, resolveGeocode } from "@/lib/geocode-id";
import {
    buildMemberDistributionFromRecords,
    buildMemberDistributionStats,
} from "@/lib/services/member-distribution";

test("normalizeRegionName removes prefixes and extra spaces", () => {
    assert.equal(normalizeRegionName("Kabupaten Bogor"), "bogor");
    assert.equal(normalizeRegionName("Kab.  Malang"), "malang");
    assert.equal(normalizeRegionName("Kota   Jakarta"), "jakarta");
});

test("resolveGeocode prefers city then province and falls back to country", () => {
    const cityHit = resolveGeocode({ city: "Jakarta", province: "West Java" });
    assert.deepEqual(cityHit, { latitude: -6.2088, longitude: 106.8456, source: "city" });

    const provinceHit = resolveGeocode({ city: null, province: "Bali" });
    assert.deepEqual(provinceHit, { latitude: -8.6705, longitude: 115.2126, source: "province" });

    const fallback = resolveGeocode({ city: null, province: null });
    assert.deepEqual(fallback, { latitude: -2.5, longitude: 118.0, source: "country" });
});

test("buildMemberDistribution groups city/province/unknown and picks representative username", () => {
    const now = new Date();
    const users = [
        {
            id: "1",
            username: "bob",
            provinceName: "West Java",
            city: "Bandung",
            countryCode: null,
            countryName: null,
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
        {
            id: "2",
            username: "alice",
            provinceName: "West Java",
            city: "Bandung",
            countryCode: null,
            countryName: null,
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
        {
            id: "3",
            username: "charlie",
            provinceName: "West Java",
            city: null,
            countryCode: null,
            countryName: null,
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
        {
            id: "4",
            username: "dina",
            provinceName: null,
            city: null,
            countryCode: null,
            countryName: null,
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
    ];

    const distribution = buildMemberDistributionFromRecords(users);
    const bandungGroup = distribution.find((item) => item.city === "Bandung");
    const provinceGroup = distribution.find((item) => item.city === null && item.province === "West Java");
    const unknownGroup = distribution.find((item) => item.city === null && item.province === null && item.country === "International");

    assert.ok(bandungGroup);
    assert.equal(bandungGroup?.memberCount, 2);
    assert.equal(bandungGroup?.username, "alice");

    assert.ok(provinceGroup);
    assert.equal(provinceGroup?.memberCount, 1);

    assert.ok(unknownGroup);
    assert.equal(unknownGroup?.memberCount, 1);
});

test("buildMemberDistribution groups international users by country", () => {
    const now = new Date();
    const users = [
        {
            id: "1",
            username: "hana",
            provinceName: null,
            city: null,
            countryCode: "SG",
            countryName: "Singapore",
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
        {
            id: "2",
            username: "kevin",
            provinceName: null,
            city: null,
            countryCode: "SG",
            countryName: "Singapore",
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
    ];

    const distribution = buildMemberDistributionFromRecords(users);
    const singaporeGroup = distribution.find((item) => item.country === "Singapore");
    assert.ok(singaporeGroup);
    assert.equal(singaporeGroup?.memberCount, 2);
    assert.equal(singaporeGroup?.province, null);
    assert.equal(singaporeGroup?.city, null);
});

test("buildMemberDistributionStats returns totals and top regions", () => {
    const now = new Date();
    const users = [
        {
            id: "1",
            username: "bob",
            provinceName: "West Java",
            city: "Bandung",
            countryCode: null,
            countryName: null,
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
        {
            id: "2",
            username: "alice",
            provinceName: "West Java",
            city: "Bandung",
            countryCode: null,
            countryName: null,
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
        {
            id: "3",
            username: "charlie",
            provinceName: "West Java",
            city: null,
            countryCode: null,
            countryName: null,
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
        {
            id: "4",
            username: "dina",
            provinceName: "Bali",
            city: "Denpasar",
            countryCode: null,
            countryName: null,
            role: "MEMBER",
            status: "ACTIVE",
            avatarUrl: null,
            createdAt: now,
            lastActiveAt: now,
        },
    ];

    const stats = buildMemberDistributionStats(users);
    assert.equal(stats.totalMembers, 4);
    assert.equal(stats.topCities[0]?.name, "Bandung");
    assert.equal(stats.topCities[0]?.count, 2);
    assert.equal(stats.topProvince?.name, "West Java");
    assert.equal(stats.topProvince?.count, 3);
});
