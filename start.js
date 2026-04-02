const { execSync } = require("child_process");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");

process.env.APP_ROOT = process.env.APP_ROOT || __dirname;
const APP_ROOT = process.env.APP_ROOT;
const DEFAULT_PORT = "5116";
const DEFAULT_HOST = "0.0.0.0";

const MIGRATE_STRATEGY = (process.env.PRISMA_MIGRATE_STRATEGY || "deploy").toLowerCase();
const ALLOW_DEV_FALLBACK = process.env.ALLOW_DEV_FALLBACK === "1";

function getRequiredDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (!databaseUrl) {
        throw new Error(
            "DATABASE_URL is not set. Add it in Pterodactyl server variables or provide it in a .env file before starting the app."
        );
    }

    try {
        new URL(databaseUrl);
    } catch {
        throw new Error(
            "DATABASE_URL is invalid. If the database password contains reserved characters such as @, :, /, ?, or #, URL-encode the password first."
        );
    }

    return databaseUrl;
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
    if (MIGRATE_STRATEGY === "deploy") {
        run("npx prisma migrate deploy");
        return;
    }
    if (MIGRATE_STRATEGY === "push") {
        console.warn("\nWARNING: Using prisma db push. This is not recommended for production.");
        run("npx prisma db push");
        return;
    }
    throw new Error(`Unknown PRISMA_MIGRATE_STRATEGY: ${MIGRATE_STRATEGY}`);
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";

installDependencies();
loadDotEnv();
getRequiredDatabaseUrl();
run("npx prisma generate");
runMigrations();

try {
    run("npm run build");
} catch (error) {
    if (ALLOW_DEV_FALLBACK && shouldFallbackToDev(error)) {
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
