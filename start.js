const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { assertUnsafeSchemaSyncAllowed, runPrismaPreflight } = require("./scripts/prisma-preflight");

process.env.APP_ROOT = process.env.APP_ROOT || __dirname;
const APP_ROOT = process.env.APP_ROOT;
const DEFAULT_PORT = "5116";
const DEFAULT_HOST = "0.0.0.0";

function isTruthy(value) {
    return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function run(cmd, options = {}) {
    console.log(`\n=== ${cmd} ===`);
    execSync(cmd, { stdio: "inherit", ...options });
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    ensureDir(dest);
    fs.cpSync(src, dest, { recursive: true });
}

function copyFileIfExists(src, dest) {
    if (!fs.existsSync(src)) return;
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

function startDevServer() {
    process.env.PORT = process.env.PORT || DEFAULT_PORT;
    process.env.HOSTNAME = process.env.HOSTNAME || DEFAULT_HOST;
    console.warn("\nBuild fallback active: starting Next.js dev server because standalone build is blocked on this Windows environment.");
    run(`npx next dev -p ${process.env.PORT} -H ${process.env.HOSTNAME}`);
}

function shouldFallbackToDev(error) {
    const chunks = [
        error?.message,
        error?.stderr?.toString?.(),
        error?.stdout?.toString?.(),
        Array.isArray(error?.output) ? error.output.map((item) => item?.toString?.() || "").join("\n") : "",
        error?.stack,
    ];
    const details = chunks.filter(Boolean).join("\n");
    return process.platform === "win32" && details.includes("spawn EPERM");
}

function installDependencies() {
    const hasPackageLock = fs.existsSync(path.join(APP_ROOT, "package-lock.json"));
    if (hasPackageLock) {
        run("npm ci --include=dev --legacy-peer-deps");
        return;
    }
    run("npm install --include=dev --legacy-peer-deps");
}

function loadDotEnv() {
    try {
        require("dotenv/config");
    } catch (error) {
        console.warn("\nWARNING: dotenv is not available. Ensure dependencies are installed before running start.js.");
        throw error;
    }
}

function runMigrations() {
    const strategy = (process.env.PRISMA_MIGRATE_STRATEGY || "deploy").toLowerCase();
    const acceptDataLoss = isTruthy(process.env.PRISMA_DB_PUSH_ACCEPT_DATA_LOSS);
    const dbPushCommand = `npx prisma db push${acceptDataLoss ? " --accept-data-loss" : ""}`;
    assertUnsafeSchemaSyncAllowed(strategy);

    if (strategy === "deploy") {
        run("npx prisma migrate deploy");
        return;
    }
    if (strategy === "push") {
        console.warn("\nWARNING: Using prisma db push. This is not recommended for production.");
        run(dbPushCommand);
        return;
    }
    if (strategy === "deploy_then_push") {
        run("npx prisma migrate deploy");
        console.warn("\nWARNING: Running prisma db push after migrate. Use only on dev/empty databases.");
        run(dbPushCommand);
        return;
    }
    if (strategy === "bootstrap") {
        console.warn("\nWARNING: Running bootstrap schema sync via prisma db push.");
        run(dbPushCommand);
        return;
    }
    if (strategy === "none") {
        console.warn("\nWARNING: PRISMA_MIGRATE_STRATEGY=none (skipping migrations).");
        return;
    }
    throw new Error(`Unknown PRISMA_MIGRATE_STRATEGY: ${strategy}`);
}

function runSeed() {
    if (!isTruthy(process.env.RUN_SEED)) {
        console.log("\n=== Seed skipped (RUN_SEED not enabled) ===");
        return;
    }
    const seedStrategy = (process.env.SEED_STRATEGY || "admin").toLowerCase();
    if (seedStrategy === "admin") {
        console.log("\n=== Seeding admin user ===");
        run("npm run seed:admin");
        return;
    }
    if (seedStrategy === "dev") {
        console.warn("\nWARNING: Dev seed will wipe existing data. Use only on empty/dev databases.");
        run("npm run seed:dev");
        return;
    }
    throw new Error(`Unknown SEED_STRATEGY: ${seedStrategy}`);
}

function ensureStandaloneBuildAvailable() {
    const standalonePath = path.join(APP_ROOT, ".next", "standalone", "server.js");
    if (!fs.existsSync(standalonePath)) {
        throw new Error(
            "SKIP_BUILD is enabled but .next/standalone/server.js is missing. Build locally and upload .next/standalone and .next/static, or disable SKIP_BUILD."
        );
    }
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";

installDependencies();
loadDotEnv();
runPrismaPreflight({ appRoot: APP_ROOT, env: process.env });
run("npx prisma generate");
runMigrations();
runSeed();

try {
    if (isTruthy(process.env.SKIP_BUILD)) {
        console.log("\n=== Build skipped (SKIP_BUILD enabled) ===");
        ensureStandaloneBuildAvailable();
    } else {
        run("npm run build");
    }
} catch (error) {
    if (isTruthy(process.env.ALLOW_DEV_FALLBACK) && shouldFallbackToDev(error)) {
        startDevServer();
        process.exit(0);
    }
    throw error;
}

console.log("\n=== Copying static files ===");
copyDir(path.join(APP_ROOT, ".next", "static"), path.join(APP_ROOT, ".next", "standalone", ".next", "static"));
copyDir(path.join(APP_ROOT, "public"), path.join(APP_ROOT, ".next", "standalone", "public"));

console.log("\n=== Copying database files ===");
if (fs.existsSync(path.join(APP_ROOT, "prisma"))) {
    copyDir(path.join(APP_ROOT, "prisma"), path.join(APP_ROOT, ".next", "standalone", "prisma"));
    console.log("Copied prisma/ to standalone");
}
copyFileIfExists(path.join(APP_ROOT, ".env"), path.join(APP_ROOT, ".next", "standalone", ".env"));
if (fs.existsSync(path.join(APP_ROOT, "public", "uploads"))) {
    copyDir(path.join(APP_ROOT, "public", "uploads"), path.join(APP_ROOT, ".next", "standalone", "public", "uploads"));
    console.log("Copied public/uploads/ to standalone");
}

console.log("\n=== Starting server ===");
process.env.PORT = process.env.PORT || DEFAULT_PORT;
process.env.HOSTNAME = DEFAULT_HOST;
require(path.join(APP_ROOT, ".next", "standalone", "server.js"));
