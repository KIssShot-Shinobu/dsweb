-- DropForeignKey
ALTER TABLE `Match` DROP FOREIGN KEY `Match_playerAId_fkey`;

-- DropForeignKey
ALTER TABLE `Match` DROP FOREIGN KEY `Match_playerBId_fkey`;

-- DropForeignKey
ALTER TABLE `Match` DROP FOREIGN KEY `Match_winnerId_fkey`;

-- DropForeignKey
ALTER TABLE `MatchPlayer` DROP FOREIGN KEY `MatchPlayer_matchId_fkey`;

-- DropForeignKey
ALTER TABLE `MatchPlayer` DROP FOREIGN KEY `MatchPlayer_userId_fkey`;

-- DropForeignKey
ALTER TABLE `MatchResult` DROP FOREIGN KEY `MatchResult_winnerId_fkey`;

-- DropIndex
DROP INDEX `Match_winnerId_fkey` ON `Match`;

-- DropIndex
DROP INDEX `MatchPlayer_matchId_userId_key` ON `MatchPlayer`;

-- DropIndex
DROP INDEX `MatchPlayer_userId_idx` ON `MatchPlayer`;

-- AlterTable
ALTER TABLE `MatchPlayer` DROP COLUMN `userId`,
    ADD COLUMN `participantId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `MatchPlayer_participantId_idx` ON `MatchPlayer`(`participantId`);

-- CreateIndex
CREATE UNIQUE INDEX `MatchPlayer_matchId_participantId_key` ON `MatchPlayer`(`matchId`, `participantId`);

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_playerAId_fkey` FOREIGN KEY (`playerAId`) REFERENCES `TournamentParticipant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_playerBId_fkey` FOREIGN KEY (`playerBId`) REFERENCES `TournamentParticipant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_winnerId_fkey` FOREIGN KEY (`winnerId`) REFERENCES `TournamentParticipant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchPlayer` ADD CONSTRAINT `MatchPlayer_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `TournamentParticipant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchResult` ADD CONSTRAINT `MatchResult_winnerId_fkey` FOREIGN KEY (`winnerId`) REFERENCES `TournamentParticipant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

