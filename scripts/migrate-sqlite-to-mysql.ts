// scripts/migrate-sqlite-to-mysql.ts
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const sqliteDbPath = path.resolve(process.cwd(), 'prisma/dev.db');
// Instantiate Prisma (yang saat ini sudah di-switch ke MySQL)
const prismaMySQL = new PrismaClient();

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrate() {
    console.log('⏳ Memulai Migrasi Data SQLite -> MySQL Remote...');

    try {
        const sqlite = new Database(sqliteDbPath, { readonly: true });

        // Safety Check: Pastikan DB MySQL target kosong (atau kita timpa spesifik tabel)
        const existingUsers = await prismaMySQL.user.count();
        if (existingUsers > 0) {
            console.log('⚠️ PERINGATAN: Database MySQL Target sudah berisi data (Users > 0). Migrasi dibatalkan untuk mencegah duplikasi.');
            process.exit(1);
        }

        // 1. Migrate Users
        console.log('➡️ Mengekstrak tabel User...');
        const users = sqlite.prepare('SELECT * FROM User').all() as any[];
        if (users.length > 0) {
            // Kita memakai createMany, tapi SQLite menyimpan boolean sebagai 1/0 dan Date sbg string/unix
            // Oleh karena itu mapping parse sangat krusial
            const parsedUsers = users.map((u) => ({
                ...u,
                createdAt: new Date(u.createdAt),
                updatedAt: new Date(u.updatedAt),
                deletedAt: u.deletedAt ? new Date(u.deletedAt) : null,
                lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null
            }));
            await prismaMySQL.user.createMany({ data: parsedUsers, skipDuplicates: true });
            console.log(`✅ Berhasil mentransfer ${users.length} Users.`);
        }

        // 2. Migrate GameProfiles
        const gameProfiles = sqlite.prepare('SELECT * FROM GameProfile').all() as any[];
        if (gameProfiles.length > 0) {
            const parsedProfiles = gameProfiles.map(p => ({
                ...p,
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt)
            }));
            await prismaMySQL.gameProfile.createMany({ data: parsedProfiles, skipDuplicates: true });
            console.log(`✅ Berhasil mentransfer ${gameProfiles.length} Game Profiles.`);
        }

        // 3. Migrate Tournaments
        const tourneys = sqlite.prepare('SELECT * FROM Tournament').all() as any[];
        if (tourneys.length > 0) {
            const parsedTourneys = tourneys.map(t => ({
                ...t,
                startDate: new Date(t.startDate),
                createdAt: new Date(t.createdAt),
                updatedAt: new Date(t.updatedAt)
            }));
            await prismaMySQL.tournament.createMany({ data: parsedTourneys, skipDuplicates: true });
            console.log(`✅ Berhasil mentransfer ${tourneys.length} Turnamen.`);
        }

        // 4. Migrate Participants
        const participants = sqlite.prepare('SELECT * FROM TournamentParticipant').all() as any[];
        if (participants.length > 0) {
            const parsedParticipants = participants.map(p => ({
                ...p,
                joinedAt: new Date(p.joinedAt)
            }));
            await prismaMySQL.tournamentParticipant.createMany({ data: parsedParticipants, skipDuplicates: true });
            console.log(`✅ Berhasil mentransfer ${participants.length} Pendaftar Turnamen.`);
        }

        // 5. Migrate Treasury & Members
        const members = sqlite.prepare('SELECT * FROM Member').all() as any[];
        if (members.length > 0) {
            const parsedMembers = members.map(m => ({ ...m, joinedAt: new Date(m.joinedAt) }));
            await prismaMySQL.member.createMany({ data: parsedMembers, skipDuplicates: true });
        }

        const treasury = sqlite.prepare('SELECT * FROM Treasury').all() as any[];
        if (treasury.length > 0) {
            const parsedTreasury = treasury.map(t => ({ ...t, createdAt: new Date(t.createdAt) }));
            await prismaMySQL.treasury.createMany({ data: parsedTreasury, skipDuplicates: true });
            console.log(`✅ Berhasil mentransfer ${treasury.length} Data Treasury Kas Khusus.`);
        }

        // 6. Migrate Reg Log & Audit
        const regLogs = sqlite.prepare('SELECT * FROM RegistrationLog').all() as any[];
        if (regLogs.length > 0) {
            const parsedRegLogs = regLogs.map(r => ({ ...r, createdAt: new Date(r.createdAt), agreement: r.agreement === 1 }));
            await prismaMySQL.registrationLog.createMany({ data: parsedRegLogs, skipDuplicates: true });
        }

        const auditLogs = sqlite.prepare('SELECT * FROM AuditLog').all() as any[];
        if (auditLogs.length > 0) {
            const parsedAuditLogs = auditLogs.map(a => ({ ...a, createdAt: new Date(a.createdAt) }));
            await prismaMySQL.auditLog.createMany({ data: parsedAuditLogs, skipDuplicates: true });
            console.log(`✅ Berhasil mentransfer ${auditLogs.length} Riwayat Login/Audit Logs.`);
        }

        console.log('🎉 SELURUH DATA SQLITE BERHASIL DI-MIGRASI KE MYSQL!');

    } catch (error) {
        console.error('❌ Terjadi kesalahan fatal sewaktu migrasi:', error);
    } finally {
        await prismaMySQL.$disconnect();
    }
}

migrate();
