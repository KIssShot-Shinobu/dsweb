const { PrismaClient } = require("../app/generated/prisma/client.js");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

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
    console.log("✅ Admin seeded:", user.email);
    console.log("   Password: Admin123!");
    await prisma.$disconnect();
}

main().catch((e) => { console.error("❌ Seed failed:", e.message); process.exit(1); });
