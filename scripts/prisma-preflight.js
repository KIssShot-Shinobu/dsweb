const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const KNOWN_STRATEGIES = new Set(["deploy", "push", "deploy_then_push", "bootstrap", "none"]);
const UNSAFE_SYNC_STRATEGIES = new Set(["push", "deploy_then_push", "bootstrap"]);
const MIGRATION_DEPENDENT_STRATEGIES = new Set(["deploy", "deploy_then_push"]);

function isTruthy(value) {
    return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function getDbProviderFromUrl(databaseUrl) {
    try {
        const parsed = new URL(databaseUrl);
        if (parsed.protocol === "postgresql:" || parsed.protocol === "postgres:") return "postgresql";
        if (parsed.protocol === "mysql:" || parsed.protocol === "mariadb:") return "mysql";
    } catch {
        // ignore parse errors
    }
    return "unknown";
}

function readSchemaProvider(appRoot) {
    const schemaPath = path.join(appRoot, "prisma", "schema.prisma");
    if (!fs.existsSync(schemaPath)) return null;
    const content = fs.readFileSync(schemaPath, "utf8");
    const match = content.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"([^"]+)"/m);
    return match?.[1] || null;
}

function readMigrationLockProvider(appRoot) {
    const lockPath = path.join(appRoot, "prisma", "migrations", "migration_lock.toml");
    if (!fs.existsSync(lockPath)) return null;
    const content = fs.readFileSync(lockPath, "utf8");
    const match = content.match(/^\s*provider\s*=\s*"([^"]+)"/m);
    return match?.[1] || null;
}

function assertUnsafeSchemaSyncAllowed(strategy, env = process.env) {
    if (!UNSAFE_SYNC_STRATEGIES.has(strategy)) return;
    if (env.NODE_ENV === "production" && !isTruthy(env.PRISMA_ALLOW_UNSAFE_SCHEMA_SYNC)) {
        throw new Error(
            `PRISMA_MIGRATE_STRATEGY=${strategy} requires PRISMA_ALLOW_UNSAFE_SCHEMA_SYNC=1 in production.`
        );
    }
}

function validatePrismaPreflight({ appRoot, env = process.env }) {
    const errors = [];
    const warnings = [];
    const strategy = (env.PRISMA_MIGRATE_STRATEGY || "deploy").toLowerCase();
    const databaseUrl = env.DATABASE_URL?.trim() || "";
    const schemaProvider = readSchemaProvider(appRoot);
    const migrationProvider = readMigrationLockProvider(appRoot);
    const allowMismatch = isTruthy(env.ALLOW_MIGRATION_PROVIDER_MISMATCH);

    if (!KNOWN_STRATEGIES.has(strategy)) {
        errors.push(`Unknown PRISMA_MIGRATE_STRATEGY: ${strategy}`);
    }

    if (!databaseUrl) {
        errors.push(
            "DATABASE_URL is not set. Add it in server variables or .env before starting the app."
        );
    }

    let dbProvider = "unknown";
    if (databaseUrl) {
        try {
            new URL(databaseUrl);
            dbProvider = getDbProviderFromUrl(databaseUrl);
        } catch {
            errors.push(
                "DATABASE_URL is invalid. URL-encode reserved characters in password (@, :, /, ?, #)."
            );
        }
    }

    if (!schemaProvider) {
        errors.push("Cannot read Prisma datasource provider from prisma/schema.prisma.");
    }

    if (schemaProvider && dbProvider !== "unknown" && dbProvider !== schemaProvider) {
        errors.push(
            `DATABASE_URL provider (${dbProvider}) does not match prisma/schema.prisma provider (${schemaProvider}).`
        );
    }

    const providerMismatch = Boolean(schemaProvider && migrationProvider && migrationProvider !== schemaProvider);
    if (providerMismatch) {
        if (!allowMismatch) {
            errors.push(
                `migration_lock provider (${migrationProvider}) does not match schema provider (${schemaProvider}). ` +
                "Set ALLOW_MIGRATION_PROVIDER_MISMATCH=1 only for controlled bootstrap windows."
            );
        } else if (MIGRATION_DEPENDENT_STRATEGIES.has(strategy)) {
            errors.push(
                `PRISMA_MIGRATE_STRATEGY=${strategy} cannot run while migration provider (${migrationProvider}) ` +
                `differs from schema provider (${schemaProvider}). Use strategy=bootstrap or none.`
            );
        } else {
            warnings.push(
                `Provider mismatch allowed: migration_lock=${migrationProvider}, schema=${schemaProvider}.`
            );
        }
    }

    try {
        assertUnsafeSchemaSyncAllowed(strategy, env);
    } catch (error) {
        errors.push(error.message);
    }

    if (strategy === "none") {
        warnings.push("PRISMA_MIGRATE_STRATEGY=none (schema migration is skipped).");
    }

    return {
        strategy,
        dbProvider,
        schemaProvider,
        migrationProvider,
        errors,
        warnings,
    };
}

function runPrismaPreflight(options = {}) {
    const appRoot = options.appRoot || process.cwd();
    const env = options.env || process.env;
    const result = validatePrismaPreflight({ appRoot, env });
    if (result.errors.length > 0) {
        throw new Error(result.errors.join("\n"));
    }
    return result;
}

function printPreflightSummary(result) {
    console.log("Prisma preflight OK");
    console.log(`- strategy: ${result.strategy}`);
    console.log(`- database provider: ${result.dbProvider}`);
    console.log(`- schema provider: ${result.schemaProvider || "unknown"}`);
    console.log(`- migration provider: ${result.migrationProvider || "missing"}`);
    if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
            console.warn(`- warning: ${warning}`);
        }
    }
}

module.exports = {
    assertUnsafeSchemaSyncAllowed,
    isTruthy,
    runPrismaPreflight,
    validatePrismaPreflight,
};

if (require.main === module) {
    try {
        try {
            require("dotenv/config");
        } catch {
            // dotenv is optional for environments that inject vars directly.
        }
        const result = runPrismaPreflight({ appRoot: process.cwd(), env: process.env });
        printPreflightSummary(result);
        process.exit(0);
    } catch (error) {
        console.error("\nPrisma preflight failed.");
        console.error(error.message);
        process.exit(1);
    }
}
