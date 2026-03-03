const { execSync } = require("child_process");

function run(cmd) {
    console.log(`\n=== ${cmd} ===`);
    execSync(cmd, { stdio: "inherit" });
}

run("npm install");
run("npx prisma generate");
run("npx prisma db push");
run("npm run build");

// Copy static files for standalone mode
const fs = require("fs");
const path = require("path");

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

console.log("\n=== Copying static files ===");
copyDir(".next/static", ".next/standalone/.next/static");
copyDir("public", ".next/standalone/public");

// Copy database and prisma files to standalone
console.log("\n=== Copying database files ===");
if (fs.existsSync("dev.db")) {
    fs.copyFileSync("dev.db", ".next/standalone/dev.db");
    console.log("Copied dev.db to standalone");
}
if (fs.existsSync("prisma")) {
    copyDir("prisma", ".next/standalone/prisma");
    console.log("Copied prisma/ to standalone");
}
if (fs.existsSync(".env")) {
    fs.copyFileSync(".env", ".next/standalone/.env");
    console.log("Copied .env to standalone");
}

console.log("\n=== Starting server ===");
process.env.PORT = process.env.PORT || "5116";
process.env.HOSTNAME = "0.0.0.0";
require("./.next/standalone/server.js");
