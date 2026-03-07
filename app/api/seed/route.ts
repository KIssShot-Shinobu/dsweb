import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function getSeedConfig() {
    if (process.env.NODE_ENV === "production") {
        return { error: "Not allowed in production", status: 403 as const };
    }

    if (process.env.ALLOW_DEV_SEED_ENDPOINT !== "true") {
        return { error: "Seed endpoint is disabled", status: 403 as const };
    }

    const email = process.env.ADMIN_SEED_EMAIL;
    const password = process.env.ADMIN_SEED_PASSWORD;

    if (!email || !password) {
        return { error: "ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required", status: 500 as const };
    }

    return {
        email,
        password,
        fullName: process.env.ADMIN_SEED_NAME || "Admin Duel Standby",
        phoneWhatsapp: process.env.ADMIN_SEED_PHONE || "+628000000001",
        city: process.env.ADMIN_SEED_CITY || "Jakarta",
    };
}

export async function GET() {
    const seedConfig = getSeedConfig();
    if ("error" in seedConfig) {
        return NextResponse.json({ error: seedConfig.error }, { status: seedConfig.status });
    }

    try {
        const hash = await bcrypt.hash(seedConfig.password, 12);
        const user = await prisma.user.upsert({
            where: { email: seedConfig.email },
            update: {},
            create: {
                fullName: seedConfig.fullName,
                email: seedConfig.email,
                password: hash,
                phoneWhatsapp: seedConfig.phoneWhatsapp,
                city: seedConfig.city,
                status: "ACTIVE",
                role: "ADMIN",
            },
        });

        return NextResponse.json({
            success: true,
            message: "Admin seeded",
            email: user.email,
        });
    } catch (error) {
        console.error("[Seed API]", error);
        return NextResponse.json({ success: false, error: "Failed to seed admin user" }, { status: 500 });
    }
}
