const { PrismaClient } = require("../app/generated/prisma/client.js");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const p = new PrismaClient({ adapter });

console.log("PrismaClient type:", typeof p);
console.log("user type:", typeof p.user);
console.log("Keys:", Object.keys(Object.getPrototypeOf(p)));
p.$disconnect();
