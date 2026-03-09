require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const bcrypt = require("bcryptjs");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set in .env");
}

const adminEmail = process.env.ADMIN_SEED_EMAIL;
const adminPassword = process.env.ADMIN_SEED_PASSWORD;
if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required");
}

function toUsername(value) {
    return (
        value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, ".")
            .replace(/\.{2,}/g, ".")
            .replace(/^\.|\.$/g, "")
            .slice(0, 24) || "duelstandby.admin"
    );
}

const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
});

async function main() {
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
            city: process.env.ADMIN_SEED_CITY || "Jakarta",
            status: "ACTIVE",
            role: "ADMIN",
        },
    });

    console.log("Admin seeded:", user.email);
    console.log("Password sourced from ADMIN_SEED_PASSWORD.");
}

main()
    .catch((e) => {
        console.error("Seed failed:", e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
