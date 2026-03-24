import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { buildMemberDistribution } from "@/lib/services/member-distribution";

export const revalidate = 3600;

const distributionItemSchema = z.object({
    id: z.string(),
    username: z.string(),
    province: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable().optional(),
    latitude: z.number(),
    longitude: z.number(),
    memberCount: z.number().int().positive().optional(),
});

const distributionStatsSchema = z.object({
    totalMembers: z.number().int().nonnegative(),
    topCities: z.array(z.object({ name: z.string(), count: z.number().int().nonnegative() })),
    topProvince: z.object({ name: z.string(), count: z.number().int().nonnegative() }).nullable(),
});

const responseSchema = z.object({
    success: z.literal(true),
    data: z.array(distributionItemSchema),
    stats: distributionStatsSchema,
});

export async function GET() {
    try {
        const result = await buildMemberDistribution(prisma);
        const payload = { success: true as const, data: result.data, stats: result.stats };
        const parsed = responseSchema.parse(payload);

        return NextResponse.json(parsed, { status: 200 });
    } catch (error) {
        console.error("[Public Member Distribution API]", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
