-- AlterTable
ALTER TABLE `Match` ADD COLUMN `reminderSentAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `MatchDispute` ADD COLUMN `evidenceUrls` JSON NULL,
    ADD COLUMN `resolutionEvidenceUrls` JSON NULL,
    ADD COLUMN `resolutionNote` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `MatchReport` ADD COLUMN `evidenceUrls` JSON NULL;

-- AlterTable
ALTER TABLE `Tournament` ADD COLUMN `forfeitEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `forfeitGraceMinutes` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `forfeitMode` ENUM('CHECKIN_ONLY', 'SCHEDULE_NO_SHOW') NOT NULL DEFAULT 'CHECKIN_ONLY',
    ADD COLUMN `lineupSize` INTEGER NULL,
    ADD COLUMN `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta';

-- AlterTable
ALTER TABLE `TournamentParticipant` MODIFY `status` ENUM('REGISTERED', 'CHECKED_IN', 'DISQUALIFIED', 'PLAYING', 'WAITLIST') NOT NULL DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE `Treasury` ADD COLUMN `category` VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    ADD COLUMN `counterparty` VARCHAR(191) NULL,
    ADD COLUMN `method` VARCHAR(30) NOT NULL DEFAULT 'OTHER',
    ADD COLUMN `referenceCode` VARCHAR(50) NULL,
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'CLEARED';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `countryCode` VARCHAR(2) NULL,
    ADD COLUMN `countryName` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `TournamentStaff` (
    `id` VARCHAR(191) NOT NULL,
    `tournamentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('REFEREE', 'STAFF') NOT NULL DEFAULT 'REFEREE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TournamentStaff_tournamentId_role_idx`(`tournamentId`, `role`),
    INDEX `TournamentStaff_userId_idx`(`userId`),
    UNIQUE INDEX `TournamentStaff_tournamentId_userId_key`(`tournamentId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchAvailability` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `proposedById` VARCHAR(191) NOT NULL,
    `slots` JSON NOT NULL,
    `status` ENUM('PENDING', 'SELECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `selectedSlot` DATETIME(3) NULL,
    `selectedById` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MatchAvailability_matchId_status_idx`(`matchId`, `status`),
    INDEX `MatchAvailability_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchLineup` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `submittedById` VARCHAR(191) NOT NULL,
    `memberIds` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MatchLineup_matchId_idx`(`matchId`),
    INDEX `MatchLineup_teamId_idx`(`teamId`),
    UNIQUE INDEX `MatchLineup_matchId_teamId_key`(`matchId`, `teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchMessage` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(1000) NOT NULL,
    `attachmentUrls` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `editedAt` DATETIME(3) NULL,

    INDEX `MatchMessage_matchId_createdAt_idx`(`matchId`, `createdAt`),
    INDEX `MatchMessage_senderId_idx`(`senderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Treasury_createdAt_idx` ON `Treasury`(`createdAt`);

-- CreateIndex
CREATE INDEX `Treasury_category_idx` ON `Treasury`(`category`);

-- CreateIndex
CREATE INDEX `Treasury_status_idx` ON `Treasury`(`status`);

-- CreateIndex
CREATE INDEX `User_countryCode_idx` ON `User`(`countryCode`);

-- AddForeignKey
ALTER TABLE `TournamentStaff` ADD CONSTRAINT `TournamentStaff_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentStaff` ADD CONSTRAINT `TournamentStaff_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchAvailability` ADD CONSTRAINT `MatchAvailability_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchAvailability` ADD CONSTRAINT `MatchAvailability_proposedById_fkey` FOREIGN KEY (`proposedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchAvailability` ADD CONSTRAINT `MatchAvailability_selectedById_fkey` FOREIGN KEY (`selectedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchLineup` ADD CONSTRAINT `MatchLineup_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchLineup` ADD CONSTRAINT `MatchLineup_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchLineup` ADD CONSTRAINT `MatchLineup_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchMessage` ADD CONSTRAINT `MatchMessage_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchMessage` ADD CONSTRAINT `MatchMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
