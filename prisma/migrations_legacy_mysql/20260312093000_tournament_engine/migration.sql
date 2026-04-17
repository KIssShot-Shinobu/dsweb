-- AlterTable
ALTER TABLE `Tournament` ADD COLUMN `structure` ENUM('SINGLE_ELIM', 'DOUBLE_ELIM', 'SWISS') NOT NULL DEFAULT 'SINGLE_ELIM';

-- CreateTable
CREATE TABLE `TournamentRound` (
    `id` VARCHAR(191) NOT NULL,
    `tournamentId` VARCHAR(191) NOT NULL,
    `roundNumber` INTEGER NOT NULL,
    `type` ENUM('MAIN', 'UPPER', 'LOWER', 'GRAND_FINAL', 'SWISS') NOT NULL DEFAULT 'MAIN',
    `name` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TournamentRound_tournamentId_type_roundNumber_idx`(`tournamentId`, `type`, `roundNumber`),
    UNIQUE INDEX `TournamentRound_tournamentId_roundNumber_type_key`(`tournamentId`, `roundNumber`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Match` (
    `id` VARCHAR(191) NOT NULL,
    `tournamentId` VARCHAR(191) NOT NULL,
    `roundId` VARCHAR(191) NOT NULL,
    `bracketIndex` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'READY', 'ONGOING', 'RESULT_SUBMITTED', 'CONFIRMED', 'DISPUTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `playerAId` VARCHAR(191) NULL,
    `playerBId` VARCHAR(191) NULL,
    `winnerId` VARCHAR(191) NULL,
    `scoreA` INTEGER NULL DEFAULT 0,
    `scoreB` INTEGER NULL DEFAULT 0,
    `nextMatchId` VARCHAR(191) NULL,
    `nextMatchSide` ENUM('A', 'B') NULL,
    `loserNextMatchId` VARCHAR(191) NULL,
    `loserNextMatchSide` ENUM('A', 'B') NULL,
    `scheduledAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Match_tournamentId_roundId_idx`(`tournamentId`, `roundId`),
    INDEX `Match_roundId_bracketIndex_idx`(`roundId`, `bracketIndex`),
    INDEX `Match_playerAId_status_idx`(`playerAId`, `status`),
    INDEX `Match_playerBId_status_idx`(`playerBId`, `status`),
    INDEX `Match_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchPlayer` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `side` ENUM('A', 'B') NOT NULL,

    INDEX `MatchPlayer_userId_idx`(`userId`),
    UNIQUE INDEX `MatchPlayer_matchId_userId_key`(`matchId`, `userId`),
    UNIQUE INDEX `MatchPlayer_matchId_side_key`(`matchId`, `side`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchReport` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `reportedById` VARCHAR(191) NOT NULL,
    `scoreA` INTEGER NOT NULL,
    `scoreB` INTEGER NOT NULL,
    `winnerId` VARCHAR(191) NOT NULL,
    `resultSource` ENUM('PLAYER', 'ADMIN', 'SYSTEM') NOT NULL DEFAULT 'PLAYER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MatchReport_matchId_idx`(`matchId`),
    INDEX `MatchReport_reportedById_idx`(`reportedById`),
    UNIQUE INDEX `MatchReport_matchId_reportedById_key`(`matchId`, `reportedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchResult` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `winnerId` VARCHAR(191) NOT NULL,
    `scoreA` INTEGER NOT NULL,
    `scoreB` INTEGER NOT NULL,
    `confirmedById` VARCHAR(191) NULL,
    `source` ENUM('PLAYER', 'ADMIN', 'SYSTEM') NOT NULL DEFAULT 'PLAYER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MatchResult_matchId_key`(`matchId`),
    INDEX `MatchResult_winnerId_idx`(`winnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchDispute` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `raisedById` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `reason` VARCHAR(500) NULL,
    `resolvedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `MatchDispute_matchId_status_idx`(`matchId`, `status`),
    INDEX `MatchDispute_raisedById_idx`(`raisedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Tournament_structure_startDate_idx` ON `Tournament`(`structure`, `startDate`);

-- AddForeignKey
ALTER TABLE `TournamentRound` ADD CONSTRAINT `TournamentRound_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `TournamentRound`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_playerAId_fkey` FOREIGN KEY (`playerAId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_playerBId_fkey` FOREIGN KEY (`playerBId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_winnerId_fkey` FOREIGN KEY (`winnerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchPlayer` ADD CONSTRAINT `MatchPlayer_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchPlayer` ADD CONSTRAINT `MatchPlayer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchReport` ADD CONSTRAINT `MatchReport_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchReport` ADD CONSTRAINT `MatchReport_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchResult` ADD CONSTRAINT `MatchResult_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchResult` ADD CONSTRAINT `MatchResult_winnerId_fkey` FOREIGN KEY (`winnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchResult` ADD CONSTRAINT `MatchResult_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchDispute` ADD CONSTRAINT `MatchDispute_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchDispute` ADD CONSTRAINT `MatchDispute_raisedById_fkey` FOREIGN KEY (`raisedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchDispute` ADD CONSTRAINT `MatchDispute_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
