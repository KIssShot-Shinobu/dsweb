import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";

const sqliteDbPath = process.env.SQLITE_SOURCE_DB_PATH
    ? path.resolve(process.cwd(), process.env.SQLITE_SOURCE_DB_PATH)
    : path.resolve(process.cwd(), "prisma/dev.db");

const prismaMySQL = new PrismaClient();
const DEFAULT_GAME_NAMES: Record<string, string> = {
    DUEL_LINKS: "Yu-Gi-Oh! Duel Links",
    MASTER_DUEL: "Yu-Gi-Oh! Master Duel",
};

function toUsername(value: string | null | undefined) {
    return (value || "user")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, ".")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.|\.$/g, "")
        .slice(0, 24) || "user";
}

async function migrate() {
    console.log("Memulai migrasi data SQLite -> MySQL...");

    try {
        const sqlite = new Database(sqliteDbPath, { readonly: true });

        const existingUsers = await prismaMySQL.user.count();
        if (existingUsers > 0) {
            console.log("Database MySQL target sudah berisi data user. Migrasi dibatalkan.");
            process.exit(1);
        }

        const users = sqlite.prepare("SELECT * FROM User").all() as any[];
        if (users.length > 0) {
            const parsedUsers = users.map((user) => ({
                ...user,
                username: user.username || toUsername(user.fullName || user.email),
                createdAt: new Date(user.createdAt),
                updatedAt: new Date(user.updatedAt),
                deletedAt: user.deletedAt ? new Date(user.deletedAt) : null,
                lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
            }));
            await prismaMySQL.user.createMany({ data: parsedUsers, skipDuplicates: true });
            console.log(`Berhasil mentransfer ${users.length} user.`);
        }

        const ensureGame = async (code: string) => {
            return prismaMySQL.game.upsert({
                where: { code },
                update: {},
                create: {
                    code,
                    name: DEFAULT_GAME_NAMES[code] || code,
                    type: "ONLINE",
                    isOnline: true,
                },
            });
        };

        const gameProfiles = sqlite.prepare("SELECT * FROM GameProfile").all() as any[];
        if (gameProfiles.length > 0) {
            const gameMap = new Map<string, string>();
            for (const profile of gameProfiles) {
                const code = String(profile.gameType || "").toUpperCase();
                if (!code) continue;
                if (!gameMap.has(code)) {
                    const game = await ensureGame(code);
                    gameMap.set(code, game.id);
                }
            }

            const parsedProfiles = gameProfiles
                .map((profile) => {
                    const code = String(profile.gameType || "").toUpperCase();
                    const gameId = gameMap.get(code);
                    if (!gameId) return null;
                    return {
                        id: profile.id,
                        userId: profile.userId,
                        gameId,
                        gamePlayerId: profile.gameId,
                        ign: profile.ign,
                        screenshotUrl: profile.screenshotUrl || null,
                        verified: Boolean(profile.screenshotUrl),
                        createdAt: new Date(profile.createdAt),
                        updatedAt: new Date(profile.updatedAt),
                    };
                })
                .filter(Boolean) as any[];

            if (parsedProfiles.length > 0) {
                await prismaMySQL.playerGameAccount.createMany({ data: parsedProfiles, skipDuplicates: true });
                console.log(`Berhasil mentransfer ${parsedProfiles.length} player game account.`);
            }
        }

        const tournaments = sqlite.prepare("SELECT * FROM Tournament").all() as any[];
        if (tournaments.length > 0) {
            const gameMap = new Map<string, string>();
            for (const tournament of tournaments) {
                const code = String(tournament.gameType || "").toUpperCase();
                if (!code) continue;
                if (!gameMap.has(code)) {
                    const game = await ensureGame(code);
                    gameMap.set(code, game.id);
                }
            }

            const parsedTournaments = tournaments
                .map((tournament) => {
                    const code = String(tournament.gameType || "").toUpperCase();
                    const gameId = gameMap.get(code);
                    if (!gameId) return null;
                    const { gameType, startDate, ...rest } = tournament;
                    return {
                        ...rest,
                        gameId,
                        startAt: new Date(startDate),
                        createdAt: new Date(rest.createdAt),
                        updatedAt: new Date(rest.updatedAt),
                    };
                })
                .filter(Boolean) as any[];

            if (parsedTournaments.length > 0) {
                await prismaMySQL.tournament.createMany({ data: parsedTournaments, skipDuplicates: true });
                console.log(`Berhasil mentransfer ${parsedTournaments.length} turnamen.`);
            }
        }

        const participants = sqlite.prepare("SELECT * FROM TournamentParticipant").all() as any[];
        if (participants.length > 0) {
            const parsedParticipants = participants.map((participant) => ({
                ...participant,
                joinedAt: new Date(participant.joinedAt),
            }));
            await prismaMySQL.tournamentParticipant.createMany({ data: parsedParticipants, skipDuplicates: true });
            console.log(`Berhasil mentransfer ${participants.length} peserta turnamen.`);
        }

        const treasury = sqlite.prepare("SELECT * FROM Treasury").all() as any[];
        if (treasury.length > 0) {
            const parsedTreasury = treasury.map((transaction) => ({
                id: transaction.id,
                amount: transaction.amount,
                description: transaction.description,
                createdAt: new Date(transaction.createdAt),
                userId: transaction.userId ?? null,
            }));
            await prismaMySQL.treasury.createMany({ data: parsedTreasury, skipDuplicates: true });
            console.log(`Berhasil mentransfer ${treasury.length} transaksi treasury.`);
        }

        const registrationLogs = sqlite.prepare("SELECT * FROM RegistrationLog").all() as any[];
        if (registrationLogs.length > 0) {
            const parsedRegistrationLogs = registrationLogs.map((log) => ({
                ...log,
                createdAt: new Date(log.createdAt),
                agreement: log.agreement === 1,
            }));
            await prismaMySQL.registrationLog.createMany({ data: parsedRegistrationLogs, skipDuplicates: true });
        }

        const auditLogs = sqlite.prepare("SELECT * FROM AuditLog").all() as any[];
        if (auditLogs.length > 0) {
            const parsedAuditLogs = auditLogs.map((log) => ({
                ...log,
                createdAt: new Date(log.createdAt),
            }));
            await prismaMySQL.auditLog.createMany({ data: parsedAuditLogs, skipDuplicates: true });
            console.log(`Berhasil mentransfer ${auditLogs.length} audit log.`);
        }

        console.log("Seluruh data utama berhasil dimigrasikan ke MySQL.");
    } catch (error) {
        console.error("Terjadi kesalahan fatal sewaktu migrasi:", error);
    } finally {
        await prismaMySQL.$disconnect();
    }
}

migrate();
