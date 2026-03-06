import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
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
    console.log("Admin seeded:", user.email);
    console.log("Password: Admin123!");
} catch (e) {
    console.error("Seed failed:", e.message);
} finally {
    await prisma.$disconnect();
}
