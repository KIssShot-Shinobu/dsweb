-- AlterTable
ALTER TABLE `LeaderboardEntry` ADD COLUMN `gameId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TeamLeaderboardEntry` ADD COLUMN `gameId` VARCHAR(191) NULL;

-- DropForeignKey
ALTER TABLE `LeaderboardEntry` DROP FOREIGN KEY `LeaderboardEntry_userId_fkey`;

-- DropForeignKey
ALTER TABLE `TeamLeaderboardEntry` DROP FOREIGN KEY `TeamLeaderboardEntry_teamId_fkey`;

-- CreateIndex
CREATE INDEX `LeaderboardEntry_gameId_seasonId_eloRating_idx` ON `LeaderboardEntry`(`gameId`, `seasonId`, `eloRating`);

-- CreateIndex
CREATE INDEX `TeamLeaderboardEntry_gameId_seasonId_eloRating_idx` ON `TeamLeaderboardEntry`(`gameId`, `seasonId`, `eloRating`);

-- CreateIndex
CREATE UNIQUE INDEX `LeaderboardEntry_userId_seasonId_gameId_key` ON `LeaderboardEntry`(`userId`, `seasonId`, `gameId`);

-- CreateIndex
CREATE UNIQUE INDEX `TeamLeaderboardEntry_teamId_seasonId_gameId_key` ON `TeamLeaderboardEntry`(`teamId`, `seasonId`, `gameId`);

-- DropIndex
DROP INDEX `LeaderboardEntry_userId_seasonId_key` ON `LeaderboardEntry`;

-- DropIndex
DROP INDEX `TeamLeaderboardEntry_teamId_seasonId_key` ON `TeamLeaderboardEntry`;

-- AddForeignKey
ALTER TABLE `LeaderboardEntry` ADD CONSTRAINT `LeaderboardEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamLeaderboardEntry` ADD CONSTRAINT `TeamLeaderboardEntry_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `LeaderboardHistory` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `teamId` VARCHAR(191) NULL,
    `gameId` VARCHAR(191) NULL,
    `matchId` VARCHAR(191) NULL,
    `seasonId` VARCHAR(191) NULL,
    `eloBefore` DOUBLE NOT NULL,
    `eloAfter` DOUBLE NOT NULL,
    `delta` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeaderboardHistory_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `LeaderboardHistory_teamId_createdAt_idx`(`teamId`, `createdAt`),
    INDEX `LeaderboardHistory_gameId_createdAt_idx`(`gameId`, `createdAt`),
    INDEX `LeaderboardHistory_seasonId_createdAt_idx`(`seasonId`, `createdAt`),
    INDEX `LeaderboardHistory_matchId_idx`(`matchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LeaderboardEntry` ADD CONSTRAINT `LeaderboardEntry_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamLeaderboardEntry` ADD CONSTRAINT `TeamLeaderboardEntry_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaderboardHistory` ADD CONSTRAINT `LeaderboardHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaderboardHistory` ADD CONSTRAINT `LeaderboardHistory_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaderboardHistory` ADD CONSTRAINT `LeaderboardHistory_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaderboardHistory` ADD CONSTRAINT `LeaderboardHistory_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaderboardHistory` ADD CONSTRAINT `LeaderboardHistory_seasonId_fkey` FOREIGN KEY (`seasonId`) REFERENCES `Season`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
