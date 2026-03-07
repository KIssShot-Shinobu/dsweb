require("dotenv/config");

const mariadb = require("mariadb");
const crypto = require("crypto");
const { URL } = require("url");

const ENCRYPTION_PREFIX = "enc:v1";

function getKey() {
    const rawKey = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!rawKey) {
        throw new Error("DATA_ENCRYPTION_KEY or JWT_SECRET is required for sensitive field migration.");
    }

    return crypto.createHash("sha256").update(rawKey).digest();
}

function isEncryptedValue(value) {
    return typeof value === "string" && value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

function encryptValue(value) {
    if (!value || isEncryptedValue(value)) return value;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
        ENCRYPTION_PREFIX,
        iv.toString("base64url"),
        authTag.toString("base64url"),
        encrypted.toString("base64url"),
    ].join(":");
}

function decryptValue(value) {
    if (!isEncryptedValue(value)) return value;

    const [, , ivBase64, authTagBase64, encryptedBase64] = value.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivBase64, "base64url"));
    decipher.setAuthTag(Buffer.from(authTagBase64, "base64url"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedBase64, "base64url")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

function hashLookupValue(value) {
    return crypto
        .createHmac("sha256", getKey())
        .update(String(value).trim().toLowerCase())
        .digest("hex");
}

function getDatabaseConfig() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL not found.");
    }

    const parsed = new URL(databaseUrl);
    const database = parsed.pathname.replace(/^\//, "");

    if (!parsed.hostname || !database) {
        throw new Error("DATABASE_URL is missing host or database name.");
    }

    return {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database,
        connectionLimit: 1,
        acquireTimeout: 15000,
        connectTimeout: 15000,
        socketTimeout: 15000,
    };
}

async function main() {
    if (!process.env.DATABASE_URL) {
        console.warn("[SensitiveFieldMigration] DATABASE_URL not found, skipping.");
        return;
    }

    const pool = mariadb.createPool(getDatabaseConfig());

    let connection;

    try {
        connection = await pool.getConnection();
        const rows = await connection.query('SELECT id, phoneWhatsapp, phoneWhatsappHash, accountNumber, accountNumberHash, twoFactorSecret FROM User');

        let migrated = 0;
        for (const row of rows) {
            const nextPhonePlain = row.phoneWhatsapp ? decryptValue(row.phoneWhatsapp) : null;
            const nextAccountPlain = row.accountNumber ? decryptValue(row.accountNumber) : null;

            const nextPhone = nextPhonePlain ? encryptValue(nextPhonePlain) : null;
            const nextPhoneHash = nextPhonePlain ? hashLookupValue(nextPhonePlain) : null;
            const nextAccount = nextAccountPlain ? encryptValue(nextAccountPlain) : null;
            const nextAccountHash = nextAccountPlain ? hashLookupValue(nextAccountPlain) : null;
            const nextTwoFactorSecret = row.twoFactorSecret ? encryptValue(decryptValue(row.twoFactorSecret)) : null;

            const needsUpdate =
                row.phoneWhatsapp !== nextPhone ||
                row.phoneWhatsappHash !== nextPhoneHash ||
                row.accountNumber !== nextAccount ||
                row.accountNumberHash !== nextAccountHash ||
                row.twoFactorSecret !== nextTwoFactorSecret;

            if (!needsUpdate) {
                continue;
            }

            await connection.query(
                'UPDATE User SET phoneWhatsapp = ?, phoneWhatsappHash = ?, accountNumber = ?, accountNumberHash = ?, twoFactorSecret = ? WHERE id = ?',
                [nextPhone, nextPhoneHash, nextAccount, nextAccountHash, nextTwoFactorSecret, row.id]
            );
            migrated += 1;
        }

        console.log(`[SensitiveFieldMigration] Processed ${rows.length} users, updated ${migrated}.`);
    } finally {
        if (connection) connection.release();
        await pool.end();
    }
}

main().catch((error) => {
    console.error("[SensitiveFieldMigration] Failed:", error);
    process.exit(1);
});
