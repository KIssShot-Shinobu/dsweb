const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
}

function shouldEnablePgSsl(url) {
    try {
        const parsed = new URL(url);
        const sslMode = parsed.searchParams.get("sslmode") ?? parsed.searchParams.get("ssl-mode");
        const sslValue = parsed.searchParams.get("ssl");
        if (sslMode && sslMode.toLowerCase() === "require") return true;
        if (sslValue && sslValue.toLowerCase() === "true") return true;
    } catch {
        // ignore parsing errors
    }
    return false;
}

function parseBoolean(value, fallback) {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return fallback;
}

function normalizePgConnectionString(url) {
    try {
        const parsed = new URL(url);
        const sslMode = parsed.searchParams.get("sslmode") ?? parsed.searchParams.get("ssl-mode");
        const compatFlag = parsed.searchParams.get("uselibpqcompat");
        if (sslMode?.toLowerCase() === "require" && !compatFlag) {
            parsed.searchParams.set("uselibpqcompat", "true");
            return parsed.toString();
        }
    } catch {
        // ignore parsing errors
    }
    return url;
}

async function main() {
    const normalizedConnectionString = normalizePgConnectionString(databaseUrl);
    const pool = new Pool({
        connectionString: normalizedConnectionString,
        ssl: shouldEnablePgSsl(normalizedConnectionString)
            ? { rejectUnauthorized: parseBoolean(process.env.PG_SSL_REJECT_UNAUTHORIZED, true) }
            : undefined,
    });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
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
                countryCode: process.env.ADMIN_SEED_COUNTRY_CODE || "ID",
                countryName: process.env.ADMIN_SEED_COUNTRY_NAME || "Indonesia",
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
        await pool.end();
    }
}

main();
