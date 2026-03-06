const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("PrismaClient type:", typeof prisma);
    console.log("user type:", typeof prisma.user);
    console.log("Keys:", Object.keys(Object.getPrototypeOf(prisma)));
}

main()
    .catch((e) => {
        console.error("Debug failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
