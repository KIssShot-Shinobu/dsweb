require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const bcrypt = require("bcryptjs");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set in .env");
}

const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
});

async function main() {
    const hash = await bcrypt.hash("Admin123!", 12);
    const user = await prisma.user.upsert({
        where: { email: "admin@duelstandby.com" },
        update: {},
        create: {
            fullName: "Admin Duel Standby",
            email: "admin@duelstandby.com",
            password: hash,
            phoneWhatsapp: "+628000000001",
            city: "Jakarta",
            status: "ACTIVE",
            role: "ADMIN",
        },
    });
    console.log("Admin seeded:", user.email);
    console.log("Password: Admin123!");
}

main()
    .catch((e) => {
        console.error("Seed failed:", e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
