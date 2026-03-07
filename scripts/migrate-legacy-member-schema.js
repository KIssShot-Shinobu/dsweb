require("dotenv/config");

const mariadb = require("mariadb");

function parseDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set.");
    }

    const parsed = new URL(databaseUrl);

    return {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ""),
    };
}

async function columnExists(connection, tableName, columnName) {
    const rows = await connection.query(
        `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        `,
        [tableName, columnName]
    );

    return rows.length > 0;
}

async function tableExists(connection, tableName) {
    const rows = await connection.query(
        `
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        `,
        [tableName]
    );

    return rows.length > 0;
}

async function foreignKeyExists(connection, tableName, constraintName) {
    const rows = await connection.query(
        `
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = ?
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `,
        [tableName, constraintName]
    );

    return rows.length > 0;
}

async function indexExists(connection, tableName, indexName) {
    const rows = await connection.query(
        `
        SELECT INDEX_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?
        `,
        [tableName, indexName]
    );

    return rows.length > 0;
}

async function migrateLegacyMemberSchema() {
    const connection = await mariadb.createConnection(parseDatabaseUrl());

    try {
        const hasMemberTable = await tableExists(connection, "Member");
        const hasTreasuryTable = await tableExists(connection, "Treasury");

        if (!hasMemberTable || !hasTreasuryTable) {
            console.log("Legacy member schema not detected. Skipping schema bridge.");
            return;
        }

        const hasMemberId = await columnExists(connection, "Treasury", "memberId");
        if (!hasMemberId) {
            console.log("Legacy memberId column already removed. Skipping schema bridge.");
            return;
        }

        const hasUserId = await columnExists(connection, "Treasury", "userId");
        if (!hasUserId) {
            console.log("Adding Treasury.userId column...");
            await connection.query("ALTER TABLE `Treasury` ADD COLUMN `userId` VARCHAR(191) NULL");
        }

        console.log("Backfilling Treasury.userId from legacy Member records...");
        await connection.query(`
            UPDATE \`Treasury\` t
            INNER JOIN \`Member\` m ON t.\`memberId\` = m.\`id\`
            INNER JOIN \`GameProfile\` gp ON gp.\`gameId\` = m.\`gameId\`
            SET t.\`userId\` = gp.\`userId\`
            WHERE t.\`memberId\` IS NOT NULL
              AND (t.\`userId\` IS NULL OR t.\`userId\` = '')
        `);

        if (await foreignKeyExists(connection, "Treasury", "Treasury_memberId_fkey")) {
            console.log("Dropping legacy Treasury_memberId_fkey...");
            await connection.query("ALTER TABLE `Treasury` DROP FOREIGN KEY `Treasury_memberId_fkey`");
        }

        if (await indexExists(connection, "Treasury", "memberId")) {
            console.log("Dropping legacy memberId index...");
            await connection.query("ALTER TABLE `Treasury` DROP INDEX `memberId`");
        }

        console.log("Dropping legacy Treasury.memberId column...");
        await connection.query("ALTER TABLE `Treasury` DROP COLUMN `memberId`");

        console.log("Dropping legacy Member table...");
        await connection.query("DROP TABLE `Member`");

        console.log("Legacy member schema migration completed.");
    } finally {
        await connection.end();
    }
}

migrateLegacyMemberSchema().catch((error) => {
    console.error("Failed to migrate legacy Member schema:", error);
    process.exit(1);
});
