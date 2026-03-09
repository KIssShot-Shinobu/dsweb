const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

function toUsername(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, ".")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.|\.$/g, "")
        .slice(0, 24) || "duelstandby.admin";
}

const adminEmail = process.env.ADMIN_SEED_EMAIL;
const adminPassword = process.env.ADMIN_SEED_PASSWORD;
if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required");
}

async function main() {
    const prisma = new PrismaClient();
    try {
        const hash = await bcrypt.hash(adminPassword, 12);
        const adminName = process.env.ADMIN_SEED_NAME || "Admin Duel Standby";
        const adminUsername = process.env.ADMIN_SEED_USERNAME || toUsername(adminName || adminEmail.split("@")[0] || "duelstandby.admin");

        const user = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                fullName: adminName,
                username: adminUsername,
                email: adminEmail,
                password: hash,
                phoneWhatsapp: process.env.ADMIN_SEED_PHONE || "+628000000001",
                provinceCode: process.env.ADMIN_SEED_PROVINCE_CODE || null,
                provinceName: process.env.ADMIN_SEED_PROVINCE_NAME || null,
                cityCode: process.env.ADMIN_SEED_CITY_CODE || null,
                city: process.env.ADMIN_SEED_CITY_NAME || process.env.ADMIN_SEED_CITY || "Jakarta",
                status: "ACTIVE",
                role: "ADMIN",
            },
        });

        console.log("Admin seeded:", user.email);
        console.log("Password sourced from ADMIN_SEED_PASSWORD.");
    } catch (error) {
        console.error("Seed failed:", error.message);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();
