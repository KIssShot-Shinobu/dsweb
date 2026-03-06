import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const hash = await bcrypt.hash("Admin123!", 12);

try {
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
} catch (e) {
    console.error("❌ Seed failed:", e.message);
} finally {
    await prisma.$disconnect();
}
