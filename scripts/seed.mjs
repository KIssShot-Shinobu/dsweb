import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set in .env");
}

const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
});

const DEV_EMAIL_SUFFIX = "@duelstandby.local";
const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD || "DevSeed123!";

const userFixtures = [
    { fullName: "Yugi Muto", role: "MEMBER", status: "ACTIVE", city: "Jakarta", gameType: "DUEL_LINKS", gameId: "DL-DEV-001", ign: "DS Yugi", guildStatus: "NEW_PLAYER" },
    { fullName: "Seto Kaiba", role: "OFFICER", status: "ACTIVE", city: "Bandung", gameType: "MASTER_DUEL", gameId: "MD-DEV-002", ign: "DS Kaiba", guildStatus: "LEFT_GUILD" },
    { fullName: "Joey Wheeler", role: "USER", status: "ACTIVE", city: "Bekasi", gameType: "DUEL_LINKS", gameId: "DL-DEV-003", ign: "DS Joey", guildStatus: "SOLO_PLAYER" },
    { fullName: "Mai Valentine", role: "MEMBER", status: "ACTIVE", city: "Surabaya", gameType: "MASTER_DUEL", gameId: "MD-DEV-004", ign: "DS Mai", guildStatus: "LEFT_GUILD" },
    { fullName: "Tea Gardner", role: "USER", status: "ACTIVE", city: "Depok", gameType: "DUEL_LINKS", gameId: "DL-DEV-005", ign: "DS Tea", guildStatus: "NEW_PLAYER" },
    { fullName: "Tristan Taylor", role: "USER", status: "ACTIVE", city: "Bogor", gameType: "MASTER_DUEL", gameId: "MD-DEV-006", ign: "DS Tristan", guildStatus: "SOLO_PLAYER" },
    { fullName: "Bakura Ryou", role: "MEMBER", status: "ACTIVE", city: "Jakarta", gameType: "DUEL_LINKS", gameId: "DL-DEV-007", ign: "DS Bakura", guildStatus: "LEFT_GUILD" },
    { fullName: "Marik Ishtar", role: "OFFICER", status: "ACTIVE", city: "Tangerang", gameType: "MASTER_DUEL", gameId: "MD-DEV-008", ign: "DS Marik", guildStatus: "SOLO_PLAYER" },
    { fullName: "Pegasus Crawford", role: "USER", status: "BANNED", city: "Bekasi", gameType: "DUEL_LINKS", gameId: "DL-DEV-009", ign: "DS Pegasus", guildStatus: "LEFT_GUILD" },
    { fullName: "Mokuba Kaiba", role: "USER", status: "ACTIVE", city: "Bandung", gameType: "MASTER_DUEL", gameId: "MD-DEV-010", ign: "DS Mokuba", guildStatus: "NEW_PLAYER" },
    { fullName: "Jaden Yuki", role: "MEMBER", status: "ACTIVE", city: "Jakarta", gameType: "DUEL_LINKS", gameId: "DL-DEV-011", ign: "DS Jaden", guildStatus: "SOLO_PLAYER" },
    { fullName: "Aster Phoenix", role: "OFFICER", status: "ACTIVE", city: "Surabaya", gameType: "MASTER_DUEL", gameId: "MD-DEV-012", ign: "DS Aster", guildStatus: "LEFT_GUILD" },
    { fullName: "Alexis Rhodes", role: "MEMBER", status: "ACTIVE", city: "Yogyakarta", gameType: "DUEL_LINKS", gameId: "DL-DEV-013", ign: "DS Alexis", guildStatus: "NEW_PLAYER" },
    { fullName: "Zane Truesdale", role: "USER", status: "ACTIVE", city: "Semarang", gameType: "MASTER_DUEL", gameId: "MD-DEV-014", ign: "DS Zane", guildStatus: "SOLO_PLAYER" },
    { fullName: "Yusei Fudo", role: "MEMBER", status: "ACTIVE", city: "Jakarta", gameType: "DUEL_LINKS", gameId: "DL-DEV-015", ign: "DS Yusei", guildStatus: "LEFT_GUILD" },
    { fullName: "Jack Atlas", role: "OFFICER", status: "ACTIVE", city: "Bandung", gameType: "MASTER_DUEL", gameId: "MD-DEV-016", ign: "DS Jack", guildStatus: "SOLO_PLAYER" },
    { fullName: "Akiza Izinski", role: "MEMBER", status: "ACTIVE", city: "Depok", gameType: "DUEL_LINKS", gameId: "DL-DEV-017", ign: "DS Akiza", guildStatus: "NEW_PLAYER" },
    { fullName: "Crow Hogan", role: "USER", status: "ACTIVE", city: "Bogor", gameType: "MASTER_DUEL", gameId: "MD-DEV-018", ign: "DS Crow", guildStatus: "LEFT_GUILD" },
    { fullName: "Yuma Tsukumo", role: "USER", status: "ACTIVE", city: "Malang", gameType: "DUEL_LINKS", gameId: "DL-DEV-019", ign: "DS Yuma", guildStatus: "SOLO_PLAYER" },
    { fullName: "Kite Tenjo", role: "MEMBER", status: "ACTIVE", city: "Solo", gameType: "MASTER_DUEL", gameId: "MD-DEV-020", ign: "DS Kite", guildStatus: "NEW_PLAYER" },
];

const tournamentFixtures = [
    { title: "[DEV] Weekly Rush 01", gameType: "DUEL_LINKS", format: "BO3", status: "OPEN", prizePool: 150000, entryFee: 10000, startOffsetDays: 2 },
    { title: "[DEV] Weekly Rush 02", gameType: "MASTER_DUEL", format: "BO3", status: "OPEN", prizePool: 200000, entryFee: 15000, startOffsetDays: 4 },
    { title: "[DEV] Ranked Clash 03", gameType: "DUEL_LINKS", format: "BO1", status: "ONGOING", prizePool: 100000, entryFee: 0, startOffsetDays: -1 },
    { title: "[DEV] Ranked Clash 04", gameType: "MASTER_DUEL", format: "BO5", status: "OPEN", prizePool: 250000, entryFee: 20000, startOffsetDays: 7 },
    { title: "[DEV] Rookie Cup 05", gameType: "DUEL_LINKS", format: "BO3", status: "COMPLETED", prizePool: 120000, entryFee: 5000, startOffsetDays: -10 },
    { title: "[DEV] Rookie Cup 06", gameType: "MASTER_DUEL", format: "BO1", status: "CANCELLED", prizePool: 80000, entryFee: 0, startOffsetDays: 9 },
    { title: "[DEV] Guild Series 07", gameType: "DUEL_LINKS", format: "BO3", status: "OPEN", prizePool: 180000, entryFee: 10000, startOffsetDays: 5 },
    { title: "[DEV] Guild Series 08", gameType: "MASTER_DUEL", format: "BO3", status: "ONGOING", prizePool: 225000, entryFee: 15000, startOffsetDays: 0 },
    { title: "[DEV] Duel Night 09", gameType: "DUEL_LINKS", format: "BO1", status: "OPEN", prizePool: 90000, entryFee: 0, startOffsetDays: 3 },
    { title: "[DEV] Duel Night 10", gameType: "MASTER_DUEL", format: "BO3", status: "COMPLETED", prizePool: 140000, entryFee: 10000, startOffsetDays: -14 },
    { title: "[DEV] City Open 11", gameType: "DUEL_LINKS", format: "BO5", status: "OPEN", prizePool: 300000, entryFee: 25000, startOffsetDays: 12 },
    { title: "[DEV] City Open 12", gameType: "MASTER_DUEL", format: "BO3", status: "OPEN", prizePool: 275000, entryFee: 20000, startOffsetDays: 15 },
    { title: "[DEV] Speed Ladder 13", gameType: "DUEL_LINKS", format: "BO1", status: "ONGOING", prizePool: 110000, entryFee: 5000, startOffsetDays: -2 },
    { title: "[DEV] Speed Ladder 14", gameType: "MASTER_DUEL", format: "BO1", status: "OPEN", prizePool: 130000, entryFee: 5000, startOffsetDays: 1 },
    { title: "[DEV] Meta Breaker 15", gameType: "DUEL_LINKS", format: "BO3", status: "COMPLETED", prizePool: 160000, entryFee: 10000, startOffsetDays: -20 },
    { title: "[DEV] Meta Breaker 16", gameType: "MASTER_DUEL", format: "BO5", status: "OPEN", prizePool: 320000, entryFee: 25000, startOffsetDays: 18 },
    { title: "[DEV] Prime Cup 17", gameType: "DUEL_LINKS", format: "BO3", status: "OPEN", prizePool: 210000, entryFee: 15000, startOffsetDays: 6 },
    { title: "[DEV] Prime Cup 18", gameType: "MASTER_DUEL", format: "BO3", status: "CANCELLED", prizePool: 175000, entryFee: 10000, startOffsetDays: 21 },
    { title: "[DEV] Final Stage 19", gameType: "DUEL_LINKS", format: "BO5", status: "OPEN", prizePool: 350000, entryFee: 30000, startOffsetDays: 25 },
    { title: "[DEV] Final Stage 20", gameType: "MASTER_DUEL", format: "BO5", status: "OPEN", prizePool: 400000, entryFee: 35000, startOffsetDays: 30 },
];

const treasuryFixtures = [
    { description: "[DEV SEED] Iuran member minggu 1", amount: 150000, userIndex: 0, dayOffset: -18 },
    { description: "[DEV SEED] Iuran member minggu 2", amount: 125000, userIndex: 1, dayOffset: -17 },
    { description: "[DEV SEED] Sponsorship lokal", amount: 300000, userIndex: null, dayOffset: -16 },
    { description: "[DEV SEED] Hadiah Weekly Rush 01", amount: -100000, userIndex: 10, dayOffset: -15 },
    { description: "[DEV SEED] Biaya desain poster", amount: -45000, userIndex: null, dayOffset: -14 },
    { description: "[DEV SEED] Donasi komunitas", amount: 200000, userIndex: 6, dayOffset: -13 },
    { description: "[DEV SEED] Pembelian hadiah fisik", amount: -85000, userIndex: null, dayOffset: -12 },
    { description: "[DEV SEED] Entry fee City Open 11", amount: 175000, userIndex: 4, dayOffset: -11 },
    { description: "[DEV SEED] Operasional Discord Nitro", amount: -65000, userIndex: null, dayOffset: -10 },
    { description: "[DEV SEED] Penjualan merchandise", amount: 220000, userIndex: 15, dayOffset: -9 },
    { description: "[DEV SEED] Hadiah Duel Night 10", amount: -120000, userIndex: 12, dayOffset: -8 },
    { description: "[DEV SEED] Bantuan partner guild", amount: 180000, userIndex: null, dayOffset: -7 },
    { description: "[DEV SEED] Biaya streaming event", amount: -90000, userIndex: null, dayOffset: -6 },
    { description: "[DEV SEED] Iuran officer", amount: 95000, userIndex: 7, dayOffset: -5 },
    { description: "[DEV SEED] Hadiah Ranked Clash 03", amount: -70000, userIndex: 2, dayOffset: -4 },
    { description: "[DEV SEED] Cash in final stage", amount: 260000, userIndex: 18, dayOffset: -3 },
    { description: "[DEV SEED] Langganan tooling desain", amount: -55000, userIndex: null, dayOffset: -2 },
    { description: "[DEV SEED] Support member aktif", amount: 145000, userIndex: 16, dayOffset: -2 },
    { description: "[DEV SEED] Operasional bracket host", amount: -80000, userIndex: null, dayOffset: -1 },
    { description: "[DEV SEED] Saldo pembuka dev", amount: 500000, userIndex: null, dayOffset: 0 },
];

function getFixtureDate(dayOffset, hour = 19) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + dayOffset);
    nextDate.setHours(hour, 0, 0, 0);
    return nextDate;
}

async function cleanupDevData() {
    console.log("Cleaning legacy dev seed data...");

    const devUsers = await prisma.user.findMany({
        where: {
            email: {
                endsWith: DEV_EMAIL_SUFFIX,
            },
        },
        select: { id: true },
    });

    const devUserIds = devUsers.map((user) => user.id);

    await prisma.tournamentParticipant.deleteMany();
    await prisma.treasury.deleteMany();
    await prisma.tournament.deleteMany();

    if (devUserIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { userId: { in: devUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: devUserIds } } });
    }
}

async function seedUsers() {
    console.log("Seeding 20 dev users...");

    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
    const createdUsers = [];

    for (let index = 0; index < userFixtures.length; index += 1) {
        const fixture = userFixtures[index];
        const createdAt = getFixtureDate(index - 25, 10 + (index % 6));
        const isActive = fixture.status === "ACTIVE";
        const user = await prisma.user.create({
            data: {
                fullName: fixture.fullName,
                email: `dev-user-${String(index + 1).padStart(2, "0")}${DEV_EMAIL_SUFFIX}`,
                password: passwordHash,
                city: fixture.city,
                status: fixture.status,
                role: fixture.role,
                timezone: "Asia/Jakarta",
                language: "id",
                emailVerifiedAt: isActive ? getFixtureDate(index - 24, 9) : null,
                lastLoginAt: isActive ? getFixtureDate(index - 1, 20) : null,
                createdAt,
                updatedAt: createdAt,
                gameProfiles: {
                    create: {
                        gameType: fixture.gameType,
                        gameId: fixture.gameId,
                        ign: fixture.ign,
                        createdAt,
                    },
                },
                registrationLog: {
                    create: {
                        guildStatus: fixture.guildStatus,
                        sourceInfo: "dev-seed",
                        socialMedia: "Discord",
                        agreement: true,
                        createdAt,
                    },
                },
            },
            include: {
                gameProfiles: true,
            },
        });

        createdUsers.push(user);
        process.stdout.write(`\r  -> ${index + 1}/20`);
    }

    console.log("\nUsers done.");
    return createdUsers;
}

async function seedTournaments(createdUsers) {
    console.log("Seeding 20 dev tournaments...");

    const activeUsers = createdUsers.filter((user) => user.status === "ACTIVE");
    const createdTournaments = [];

    for (let index = 0; index < tournamentFixtures.length; index += 1) {
        const fixture = tournamentFixtures[index];
        const tournament = await prisma.tournament.create({
            data: {
                title: fixture.title,
                description: `Dataset dev tournament ${index + 1} untuk uji dashboard, public cards, dan register flow.`,
                format: fixture.format,
                gameType: fixture.gameType,
                status: fixture.status,
                entryFee: fixture.entryFee,
                prizePool: fixture.prizePool,
                startDate: getFixtureDate(fixture.startOffsetDays, 19),
                image: null,
            },
        });

        createdTournaments.push(tournament);

        const eligibleUsers = activeUsers.filter((user) => user.gameProfiles.some((profile) => profile.gameType === fixture.gameType));
        const participantCount = fixture.status === "CANCELLED" ? 0 : Math.min(eligibleUsers.length, (index % 5) + 2);

        for (let participantIndex = 0; participantIndex < participantCount; participantIndex += 1) {
            const participant = eligibleUsers[(index + participantIndex) % eligibleUsers.length];
            const profile = participant.gameProfiles.find((item) => item.gameType === fixture.gameType);
            if (!profile) continue;

            await prisma.tournamentParticipant.create({
                data: {
                    tournamentId: tournament.id,
                    userId: participant.id,
                    gameId: profile.gameId,
                    joinedAt: getFixtureDate(Math.min(fixture.startOffsetDays - 1, -1), 18),
                },
            });
        }

        process.stdout.write(`\r  -> ${index + 1}/20`);
    }

    console.log("\nTournaments done.");
    return createdTournaments;
}

async function seedTreasury(createdUsers) {
    console.log("Seeding 20 dev treasury transactions...");

    for (let index = 0; index < treasuryFixtures.length; index += 1) {
        const fixture = treasuryFixtures[index];
        await prisma.treasury.create({
            data: {
                amount: fixture.amount,
                description: fixture.description,
                createdAt: getFixtureDate(fixture.dayOffset, 14),
                userId: fixture.userIndex === null ? null : createdUsers[fixture.userIndex]?.id ?? null,
            },
        });
        process.stdout.write(`\r  -> ${index + 1}/20`);
    }

    console.log("\nTreasury done.");
}

async function main() {
    await cleanupDevData();
    const createdUsers = await seedUsers();
    await seedTournaments(createdUsers);
    await seedTreasury(createdUsers);

    console.log("Dev seed complete: 20 users, 20 tournaments, 20 treasury transactions.");
    console.log(`Dev seed user password: ${DEV_PASSWORD}`);
}

main()
    .catch((error) => {
        console.error("Dev seed failed:", error);
        process.exit(1);
    })
    .finally(async () => prisma.$disconnect());
