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
    console.log("🌱 Seeding database...");

    // Create admin account
    const adminEmail = "admin@duelstandby.com";
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existing) {
        const hashedPassword = await bcrypt.hash("Admin123!", 12);
        const admin = await prisma.user.create({
            data: {
                fullName: "Admin Duel Standby",
                username: toUsername("Admin Duel Standby"),
                email: adminEmail,
                password: hashedPassword,
                phoneWhatsapp: "+628000000000",
                city: "Jakarta",
                status: "ACTIVE",
                role: "ADMIN",
            },
        });
        console.log(`✅ Admin account created: ${admin.email}`);
    } else {
        console.log(`ℹ️  Admin already exists: ${adminEmail}`);
    }

    console.log("✅ Seed complete!");
    console.log("");
    console.log("🔐 Admin credentials:");
    console.log("   Email    : admin@duelstandby.com");
    console.log("   Password : Admin123!");
    console.log("");
    console.log("⚠️  Please change the password after first login!");
}

main()
    .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
    .finally(() => prisma.$disconnect());
