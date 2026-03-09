import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";

function toUsername(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, ".")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.|\.$/g, "")
        .slice(0, 24) || "duelstandby.admin";
}

async function main() {
    const adminEmail = process.env.ADMIN_SEED_EMAIL;
    const adminPassword = process.env.ADMIN_SEED_PASSWORD;

    if (!adminEmail || !adminPassword) {
        throw new Error("ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required for prisma/seed.ts");
    }

    const adminName = process.env.ADMIN_SEED_NAME || "Admin Duel Standby";
    const adminUsername = process.env.ADMIN_SEED_USERNAME || toUsername(adminName || adminEmail.split("@")[0] || "duelstandby.admin");
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            username: adminUsername,
            fullName: adminName,
            role: "ADMIN",
            status: "ACTIVE",
        },
        create: {
            fullName: adminName,
            username: adminUsername,
            email: adminEmail,
            password: hashedPassword,
            phoneWhatsapp: process.env.ADMIN_SEED_PHONE || "+628000000001",
            provinceCode: process.env.ADMIN_SEED_PROVINCE_CODE || null,
            provinceName: process.env.ADMIN_SEED_PROVINCE_NAME || null,
            cityCode: process.env.ADMIN_SEED_CITY_CODE || null,
            city: process.env.ADMIN_SEED_CITY_NAME || process.env.ADMIN_SEED_CITY || "Jakarta",
            status: "ACTIVE",
            role: "ADMIN",
        },
    });
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
