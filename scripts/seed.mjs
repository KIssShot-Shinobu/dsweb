// Seed script: 50 members, 50 tournaments, 50 treasury transactions
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/index.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

function randomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function cuid() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 9);
    return `c${ts}${rand}`;
}

const ranks = ["Legend", "King of Games", "Platinum", "Gold", "Silver", "Bronze", "Rookie"];
const roles = ["MEMBER", "MEMBER", "MEMBER", "OFFICER", "LEADER"];
const gameTypes = ["Duel Links", "Master Duel"];
const statuses = ["UPCOMING", "ONGOING", "COMPLETED"];

const memberNames = [
    "Yami Yugi", "Seto Kaiba", "Joey Wheeler", "Tea Gardner", "Tristan Taylor",
    "Bakura Ryou", "Marik Ishtar", "Pegasus J. Crawford", "Mai Valentine", "Weevil Underwood",
    "Rex Raptor", "Mako Tsunami", "Bonz", "Bandit Keith", "Duke Devlin",
    "Yusei Fudo", "Jack Atlas", "Crow Hogan", "Akiza Izinski", "Leo Mackenzie",
    "Luna Mackenzie", "Trudge", "Carly Carmine", "Ushio Tetsu", "Misty Tredwell",
    "Jaden Yuki", "Aster Phoenix", "Zane Truesdale", "Alexis Rhodes", "Chazz Princeton",
    "Bastion Misawa", "Syrus Truesdale", "Tyranno Hassleberry", "Jim Cook", "Blair Flannigan",
    "Yuma Tsukumo", "Shark Kamishiro", "Kite Tenjo", "Rio Kastle", "Bronk Stone",
    "Tori Meadows", "Quinton", "Vetrix", "Dextra", "Nistro",
    "Yuya Sakaki", "Zuzu Boyle", "Declan Akaba", "Gong Strong", "Sylvio Sawatari",
];

const tournamentNames = [
    "Weekly Duel #1", "Monthly Championship", "KC Cup Qualifier", "Master Series Open",
    "Grand Prix Alpha", "Rookie Brawl #1", "Elite Clash", "Speed Duel Special",
    "Tag Force Tournament", "Solo Showdown", "Dragon's Throne Cup", "Galaxy Series #1",
    "Synchro Summit", "Xyz Challenge", "Pendulum Playoffs", "Fusion Frenzy",
    "Link Festival", "Dark Side Duel", "Light Brigade Open", "Shadow Realm Invitational",
    "Number Hunter Series", "Duel Links Weekly #2", "Master Duel Ranked Cup",
    "Community Cup #1", "Beginner's Clash", "Pro League Qualifier", "Regional Championship",
    "Nationals Warmup", "Charity Duel", "Double Deck Challenge", "Side Deck Showdown",
    "Speed Ladder Sprint", "OCG Format Open", "TCG Format Open", "Draft Tournament #1",
    "Sealed Format Cup", "King of Games Cup", "Legend League", "Platinum Clash",
    "Gold Rush Open", "Silver Storm Series", "Bronze Beginnings", "Rising Stars Cup",
    "Veteran's Invitational", "All-Stars Showdown", "Random Deck Challenge",
    "Themed Deck Cup", "Anti-Meta Open", "Budget Deck Brawl", "Forbidden List Special",
];

const txDescriptions = [
    "Iuran bulanan anggota", "Hadiah tournament juara 1", "Biaya server hosting",
    "Donasi dari sponsor", "Pembelian merchandise", "Fee registrasi event",
    "Pendapatan dari event", "Biaya operasional bulanan", "Pembelian hadiah piala",
    "Sponsorship dari brand", "Saldo awal guild", "Pemasukan dari streaming",
    "Biaya design banner", "Pembelian aset digital", "Transfer antar rekening",
    "Hadiah tournament juara 2", "Hadiah tournament juara 3", "Biaya pendaftaran event luar",
    "Subsidi dari komunitas", "Kontribusi member aktif",
];

async function main() {
    // ── Members ──────────────────────────────────────────────────────────────
    console.log("🌱 Seeding 50 members...");
    const createdMembers = [];
    for (let i = 0; i < 50; i++) {
        const name = memberNames[i];
        const joinedAt = randomDate(new Date("2024-01-01"), new Date());
        const member = await prisma.member.create({
            data: {
                name,
                gameId: `DS${String(1000 + i).padStart(6, "0")}`,
                rank: randomFromArray(ranks),
                role: randomFromArray(roles),
                joinedAt,
            },
        });
        createdMembers.push(member);
        process.stdout.write(`\r  → ${i + 1}/50`);
    }
    console.log("\n✅ Members done.");

    // ── Tournaments ───────────────────────────────────────────────────────────
    console.log("🌱 Seeding 50 tournaments...");
    for (let i = 0; i < 50; i++) {
        const gameType = randomFromArray(gameTypes);
        await prisma.tournament.create({
            data: {
                title: tournamentNames[i],
                gameType,
                startDate: randomDate(new Date("2025-01-01"), new Date("2026-12-31")),
                prizePool: Math.floor(Math.random() * 50) * 10000,
                status: randomFromArray(statuses),
                description: "Open to all members. Prizes for top 3 finishers.",
            },
        });
        process.stdout.write(`\r  → ${i + 1}/50`);
    }
    console.log("\n✅ Tournaments done.");

    // ── Treasury (raw SQL to allow custom createdAt) ──────────────────────────
    console.log("🌱 Seeding 50 treasury transactions...");
    for (let i = 0; i < 50; i++) {
        const isIncome = Math.random() > 0.35;
        const amount = Math.floor((Math.random() * 39 + 1)) * 5000;
        const finalAmount = isIncome ? amount : -amount;
        const member = Math.random() > 0.4 ? randomFromArray(createdMembers) : null;
        // Spread over last 30 days so chart shows real weekly variation
        const createdAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
        const id = cuid();
        const desc = randomFromArray(txDescriptions);
        await prisma.$executeRaw`
            INSERT INTO "Treasury" (id, amount, description, "createdAt", "memberId")
            VALUES (${id}, ${finalAmount}, ${desc}, ${createdAt.toISOString()}, ${member?.id ?? null})
        `;
        process.stdout.write(`\r  → ${i + 1}/50`);
    }
    console.log("\n✅ Treasury done.");

    console.log("\n🎉 Seeding complete! 50 records per table added.");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
