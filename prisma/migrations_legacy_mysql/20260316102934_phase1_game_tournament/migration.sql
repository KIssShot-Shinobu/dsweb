/*
  Warnings:

  - You are about to drop the column `gameType` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the `GameProfile` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `gameId` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startAt` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `GameProfile` DROP FOREIGN KEY `GameProfile_userId_fkey`;

-- DropIndex
DROP INDEX `Tournament_status_startDate_idx` ON `Tournament`;

-- DropIndex
DROP INDEX `Tournament_structure_startDate_idx` ON `Tournament`;

-- AlterTable
ALTER TABLE `Tournament` DROP COLUMN `gameType`,
    DROP COLUMN `startDate`,
    ADD COLUMN `bracketSize` INTEGER NULL,
    ADD COLUMN `checkinRequired` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `gameId` VARCHAR(191) NOT NULL,
    ADD COLUMN `isTeamTournament` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `maxPlayers` INTEGER NULL,
    ADD COLUMN `minPlayers` INTEGER NULL,
    ADD COLUMN `mode` ENUM('INDIVIDUAL', 'TEAM_BOARD', 'TEAM_KOTH') NOT NULL DEFAULT 'INDIVIDUAL',
    ADD COLUMN `registrationClose` DATETIME(3) NULL,
    ADD COLUMN `registrationOpen` DATETIME(3) NULL,
    ADD COLUMN `startAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `TournamentParticipant` ADD COLUMN `status` ENUM('REGISTERED', 'CHECKED_IN', 'DISQUALIFIED', 'PLAYING') NOT NULL DEFAULT 'REGISTERED';

-- DropTable
DROP TABLE `GameProfile`;

-- CreateTable
CREATE TABLE `Game` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(50) NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Game_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerGameAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `gamePlayerId` VARCHAR(191) NOT NULL,
    `ign` VARCHAR(191) NOT NULL,
    `screenshotUrl` VARCHAR(191) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlayerGameAccount_userId_idx`(`userId`),
    UNIQUE INDEX `PlayerGameAccount_userId_gameId_key`(`userId`, `gameId`),
    UNIQUE INDEX `PlayerGameAccount_gameId_gamePlayerId_key`(`gameId`, `gamePlayerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Tournament_gameId_idx` ON `Tournament`(`gameId`);

-- CreateIndex
CREATE INDEX `Tournament_status_startAt_idx` ON `Tournament`(`status`, `startAt`);

-- CreateIndex
CREATE INDEX `Tournament_structure_startAt_idx` ON `Tournament`(`structure`, `startAt`);

-- AddForeignKey
ALTER TABLE `Tournament` ADD CONSTRAINT `Tournament_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerGameAccount` ADD CONSTRAINT `PlayerGameAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerGameAccount` ADD CONSTRAINT `PlayerGameAccount_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchPlayer` ADD CONSTRAINT `MatchPlayer_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
