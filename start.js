require("dotenv/config");

const { execSync } = require("child_process");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");

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

function run(cmd) {
    console.log(`\n=== ${cmd} ===`);
    execSync(cmd, { stdio: "inherit" });
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function startDevServer() {
    process.env.PORT = process.env.PORT || "5116";
    process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
    console.warn("\nBuild fallback active: starting Next.js dev server because standalone build is blocked on this Windows environment.");
    run(`npx next dev -p ${process.env.PORT} -H ${process.env.HOSTNAME}`);
}

function shouldFallbackToDev(error) {
    const message = String(error?.message || error || "");
    return process.platform === "win32" && message.includes("spawn EPERM");
}

run("npm install");
getRequiredDatabaseUrl();
run("npx prisma generate");
run("npx prisma db push");

try {
    run("npm run build");
} catch (error) {
    if (shouldFallbackToDev(error)) {
        startDevServer();
        process.exit(0);
    }
    throw error;
}

console.log("\n=== Copying static files ===");
copyDir(".next/static", ".next/standalone/.next/static");
copyDir("public", ".next/standalone/public");

console.log("\n=== Copying database files ===");
if (fs.existsSync("prisma")) {
    copyDir("prisma", ".next/standalone/prisma");
    console.log("Copied prisma/ to standalone");
}
if (fs.existsSync(".env")) {
    fs.copyFileSync(".env", ".next/standalone/.env");
    console.log("Copied .env to standalone");
}
if (fs.existsSync("public/uploads")) {
    copyDir("public/uploads", ".next/standalone/public/uploads");
    console.log("Copied public/uploads/ to standalone");
}

console.log("\n=== Starting server ===");
process.env.PORT = process.env.PORT || "5116";
process.env.HOSTNAME = "0.0.0.0";
require("./.next/standalone/server.js");
