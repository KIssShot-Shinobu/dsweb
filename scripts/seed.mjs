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

function toUsername(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, ".")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.|\.$/g, "")
        .slice(0, 24) || "duelstandby.user";
}

const teamFixtures = [
    {
        name: "Duel Standby Alpha",
        slug: "duel-standby-alpha",
        description: "Roster utama untuk scrim intensif dan turnamen publik besar.",
    },
    {
        name: "Duel Standby Nova",
        slug: "duel-standby-nova",
        description: "Roster pengembangan untuk member aktif yang fokus adaptasi meta terbaru.",
    },
    {
        name: "Duel Standby Flux",
        slug: "duel-standby-flux",
        description: "Roster fleksibel untuk pemain lintas Duel Links dan Master Duel.",
    },
    {
        name: "Duel Standby Echo",
        slug: "duel-standby-echo",
        description: "Roster cadangan untuk sparring, event komunitas, dan eksperimen format.",
    },
];

const userFixtures = [
    { fullName: "Yugi Muto", role: "MEMBER", status: "ACTIVE", provinceCode: "31", provinceName: "DKI Jakarta", cityCode: "3171", cityName: "Kota Jakarta Pusat", gameType: "DUEL_LINKS", gameId: "100-000-001", ign: "[DS] Yugi", teamSlug: "duel-standby-alpha" },
    { fullName: "Seto Kaiba", role: "OFFICER", status: "ACTIVE", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3273", cityName: "Kota Bandung", gameType: "MASTER_DUEL", gameId: "100-000-002", ign: "[DS] Kaiba", teamSlug: "duel-standby-alpha" },
    { fullName: "Joey Wheeler", role: "USER", status: "ACTIVE", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3275", cityName: "Kota Bekasi", gameType: "DUEL_LINKS", gameId: "100-000-003", ign: "[DS] Joey", teamSlug: null },
    { fullName: "Mai Valentine", role: "MEMBER", status: "ACTIVE", provinceCode: "35", provinceName: "Jawa Timur", cityCode: "3578", cityName: "Kota Surabaya", gameType: "MASTER_DUEL", gameId: "100-000-004", ign: "[DS] Mai", teamSlug: "duel-standby-flux" },
    { fullName: "Tea Gardner", role: "USER", status: "ACTIVE", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3276", cityName: "Kota Depok", gameType: "DUEL_LINKS", gameId: "100-000-005", ign: "[DS] Tea", teamSlug: null },
    { fullName: "Tristan Taylor", role: "USER", status: "ACTIVE", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3271", cityName: "Kota Bogor", gameType: "MASTER_DUEL", gameId: "100-000-006", ign: "[DS] Tristan", teamSlug: null },
    { fullName: "Bakura Ryou", role: "MEMBER", status: "ACTIVE", provinceCode: "31", provinceName: "DKI Jakarta", cityCode: "3171", cityName: "Kota Jakarta Pusat", gameType: "DUEL_LINKS", gameId: "100-000-007", ign: "[DS] Bakura", teamSlug: null },
    { fullName: "Marik Ishtar", role: "OFFICER", status: "ACTIVE", provinceCode: "36", provinceName: "Banten", cityCode: "3671", cityName: "Kota Tangerang", gameType: "MASTER_DUEL", gameId: "100-000-008", ign: "[DS] Marik", teamSlug: "duel-standby-nova" },
    { fullName: "Pegasus Crawford", role: "USER", status: "BANNED", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3275", cityName: "Kota Bekasi", gameType: "DUEL_LINKS", gameId: "100-000-009", ign: "[DS] Pegasus", teamSlug: null },
    { fullName: "Mokuba Kaiba", role: "USER", status: "ACTIVE", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3273", cityName: "Kota Bandung", gameType: "MASTER_DUEL", gameId: "100-000-010", ign: "[DS] Mokuba", teamSlug: null },
    { fullName: "Jaden Yuki", role: "MEMBER", status: "ACTIVE", provinceCode: "31", provinceName: "DKI Jakarta", cityCode: "3171", cityName: "Kota Jakarta Pusat", gameType: "DUEL_LINKS", gameId: "100-000-011", ign: "[DS] Jaden", teamSlug: "duel-standby-nova" },
    { fullName: "Aster Phoenix", role: "OFFICER", status: "ACTIVE", provinceCode: "35", provinceName: "Jawa Timur", cityCode: "3578", cityName: "Kota Surabaya", gameType: "MASTER_DUEL", gameId: "100-000-012", ign: "[DS] Aster", teamSlug: "duel-standby-echo" },
    { fullName: "Alexis Rhodes", role: "MEMBER", status: "ACTIVE", provinceCode: "34", provinceName: "DI Yogyakarta", cityCode: "3471", cityName: "Kota Yogyakarta", gameType: "DUEL_LINKS", gameId: "100-000-013", ign: "[DS] Alexis", teamSlug: "duel-standby-nova" },
    { fullName: "Zane Truesdale", role: "USER", status: "ACTIVE", provinceCode: "33", provinceName: "Jawa Tengah", cityCode: "3374", cityName: "Kota Semarang", gameType: "MASTER_DUEL", gameId: "100-000-014", ign: "[DS] Zane", teamSlug: null },
    { fullName: "Yusei Fudo", role: "MEMBER", status: "ACTIVE", provinceCode: "31", provinceName: "DKI Jakarta", cityCode: "3171", cityName: "Kota Jakarta Pusat", gameType: "DUEL_LINKS", gameId: "100-000-015", ign: "[DS] Yusei", teamSlug: "duel-standby-flux" },
    { fullName: "Jack Atlas", role: "OFFICER", status: "ACTIVE", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3273", cityName: "Kota Bandung", gameType: "MASTER_DUEL", gameId: "100-000-016", ign: "[DS] Jack", teamSlug: null },
    { fullName: "Akiza Izinski", role: "MEMBER", status: "ACTIVE", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3276", cityName: "Kota Depok", gameType: "DUEL_LINKS", gameId: "100-000-017", ign: "[DS] Akiza", teamSlug: "duel-standby-alpha" },
    { fullName: "Crow Hogan", role: "USER", status: "ACTIVE", provinceCode: "32", provinceName: "Jawa Barat", cityCode: "3271", cityName: "Kota Bogor", gameType: "MASTER_DUEL", gameId: "100-000-018", ign: "[DS] Crow", teamSlug: null },
    { fullName: "Yuma Tsukumo", role: "USER", status: "ACTIVE", provinceCode: "35", provinceName: "Jawa Timur", cityCode: "3573", cityName: "Kota Malang", gameType: "DUEL_LINKS", gameId: "100-000-019", ign: "[DS] Yuma", teamSlug: null },
    { fullName: "Kite Tenjo", role: "MEMBER", status: "ACTIVE", provinceCode: "33", provinceName: "Jawa Tengah", cityCode: "3372", cityName: "Kota Surakarta", gameType: "MASTER_DUEL", gameId: "100-000-020", ign: "[DS] Kite", teamSlug: null },
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
    console.log("Cleaning old dev data...");

    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.pendingUpload.deleteMany();
    await prisma.tournamentParticipant.deleteMany();
    await prisma.treasury.deleteMany();
    await prisma.tournament.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.teamInvite.deleteMany();
    await prisma.teamJoinRequest.deleteMany();
    await prisma.teamCreationRequest.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.reputationLog.deleteMany();
    await prisma.gameProfile.deleteMany();
    await prisma.registrationLog.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();
}

async function ensureAdminUser() {
    const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@duelstandby.local";
    const adminName = process.env.ADMIN_SEED_NAME || "Admin Duel Standby";
    const adminUsername = process.env.ADMIN_SEED_USERNAME || toUsername(adminName || adminEmail.split("@")[0] || "admin.duelstandby");
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || DEV_PASSWORD;
    const adminHash = await bcrypt.hash(adminPassword, 12);

    return prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            fullName: adminName,
            username: adminUsername,
            password: adminHash,
            role: "ADMIN",
            status: "ACTIVE",
        },
        create: {
            fullName: adminName,
            username: adminUsername,
            email: adminEmail,
            password: adminHash,
            phoneWhatsapp: process.env.ADMIN_SEED_PHONE || "+628000000001",
            provinceCode: process.env.ADMIN_SEED_PROVINCE_CODE || null,
            provinceName: process.env.ADMIN_SEED_PROVINCE_NAME || null,
            cityCode: process.env.ADMIN_SEED_CITY_CODE || null,
            city: process.env.ADMIN_SEED_CITY_NAME || process.env.ADMIN_SEED_CITY || "Jakarta",
            status: "ACTIVE",
            role: "ADMIN",
        },
    });
}

async function seedTeams() {
    console.log("Seeding guild teams...");

    const teamMap = new Map();
    for (const fixture of teamFixtures) {
        const team = await prisma.team.create({
            data: {
                name: fixture.name,
                slug: fixture.slug,
                description: fixture.description,
                isActive: true,
            },
        });
        teamMap.set(team.slug, team.id);
    }

    return teamMap;
}

async function seedUsers(teamMap) {
    console.log("Seeding 20 dev users...");

    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
    const createdUsers = [];
    const teamRosterCounts = new Map();

    for (let index = 0; index < userFixtures.length; index += 1) {
        const fixture = userFixtures[index];
        const createdAt = getFixtureDate(index - 25, 10 + (index % 6));
        const isActive = fixture.status === "ACTIVE";
        const teamId = fixture.teamSlug ? teamMap.get(fixture.teamSlug) || null : null;
        const user = await prisma.user.create({
            data: {
                fullName: fixture.fullName,
                username: toUsername(fixture.fullName),
                email: `dev-user-${String(index + 1).padStart(2, "0")}${DEV_EMAIL_SUFFIX}`,
                password: passwordHash,
                phoneWhatsapp: `+628120000${String(index + 1).padStart(4, "0")}`,
                provinceCode: fixture.provinceCode,
                provinceName: fixture.provinceName,
                cityCode: fixture.cityCode,
                city: fixture.cityName,
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
                        sourceInfo: "dev-seed",
                        socialMedia: "Discord,Instagram",
                        agreement: true,
                        createdAt,
                    },
                },
            },
            include: {
                gameProfiles: true,
            },
        });

        if (teamId) {
            const currentCount = teamRosterCounts.get(teamId) || 0;
            const role = currentCount === 0 ? "CAPTAIN" : currentCount === 1 ? "VICE_CAPTAIN" : "PLAYER";
            await prisma.teamMember.create({
                data: {
                    userId: user.id,
                    teamId,
                    role,
                    joinedAt: createdAt,
                    createdAt,
                    updatedAt: createdAt,
                },
            });
            teamRosterCounts.set(teamId, currentCount + 1);
        }

        createdUsers.push(user);
        process.stdout.write(`\r  -> ${index + 1}/20`);
    }

    console.log("\nUsers done.");
    return createdUsers;
}

async function seedTournaments(createdUsers, creatorId) {
    console.log("Seeding 20 dev tournaments...");

    const activeUsers = createdUsers.filter((user) => user.status === "ACTIVE");

    for (let index = 0; index < tournamentFixtures.length; index += 1) {
        const fixture = tournamentFixtures[index];
        const tournament = await prisma.tournament.create({
            data: {
                title: fixture.title,
                description: `Dataset dev tournament ${index + 1} untuk uji dashboard, public cards, register flow, dan detail page terbaru.`,
                format: fixture.format,
                gameType: fixture.gameType,
                status: fixture.status,
                entryFee: fixture.entryFee,
                prizePool: fixture.prizePool,
                startDate: getFixtureDate(fixture.startOffsetDays, 19),
                image: null,
                createdById: creatorId,
            },
        });

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
}

async function seedTreasury(createdUsers) {
    console.log("Seeding 20 dev treasury transactions...");

    for (let index = 0; index < treasuryFixtures.length; index += 1) {
        const fixture = treasuryFixtures[index];
        await prisma.treasury.create({
            data: {
                amount: fixture.amount,
                currency: "IDR",
                description: fixture.description,
                createdAt: getFixtureDate(fixture.dayOffset, 14),
                userId: fixture.userIndex === null ? null : createdUsers[fixture.userIndex]?.id ?? null,
            },
        });
        process.stdout.write(`\r  -> ${index + 1}/20`);
    }

    console.log("\nTreasury done.");
}

async function seedAuditLogs(createdUsers) {
    console.log("Seeding audit highlights...");

    const activeUsers = createdUsers.filter((user) => user.status === "ACTIVE");
    const actions = [
        "USER_REGISTERED",
        "LOGIN_SUCCESS",
        "TOURNAMENT_REGISTERED",
        "TREASURY_ADDED",
        "ROLE_CHANGED",
        "TEAM_ASSIGNED",
    ];

    for (let index = 0; index < 12; index += 1) {
        const actor = activeUsers[index % activeUsers.length];
        await prisma.auditLog.create({
            data: {
                userId: actor.id,
                action: actions[index % actions.length],
                targetType: index % 2 === 0 ? "USER" : "TOURNAMENT",
                targetId: actor.id,
                ipAddress: `10.10.0.${index + 10}`,
                requestMethod: index % 3 === 0 ? "POST" : "PUT",
                requestPath: index % 2 === 0 ? "/api/users" : "/api/tournaments/register",
                responseStatus: 200,
                details: JSON.stringify({ source: "dev-seed", seq: index + 1 }),
                createdAt: getFixtureDate(-12 + index, 11 + (index % 6)),
            },
        });
        process.stdout.write(`\r  -> ${index + 1}/12`);
    }

    console.log("\nAudit logs done.");
}

async function main() {
    await cleanupDevData();
    const adminUser = await ensureAdminUser();
    const teamMap = await seedTeams();
    const createdUsers = await seedUsers(teamMap);
    await seedTournaments(createdUsers, adminUser.id);
    await seedTreasury(createdUsers);
    await seedAuditLogs(createdUsers);

    console.log("Dev seed complete: 4 teams, 20 users, 20 tournaments, 20 treasury transactions, 12 audit logs.");
    console.log(`Dev seed user password: ${DEV_PASSWORD}`);
    console.log(`Dev admin email: ${adminUser.email}`);
}

main()
    .catch((error) => {
        console.error("Dev seed failed:", error);
        process.exit(1);
    })
    .finally(async () => prisma.$disconnect());


