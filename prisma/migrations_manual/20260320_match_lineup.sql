ALTER TABLE `Tournament`
  ADD COLUMN `lineupSize` INT NULL AFTER `maxPlayers`;

CREATE TABLE `MatchLineup` (
  `id` VARCHAR(191) NOT NULL,
  `matchId` VARCHAR(191) NOT NULL,
  `teamId` VARCHAR(191) NOT NULL,
  `submittedById` VARCHAR(191) NOT NULL,
  `memberIds` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `MatchLineup_matchId_teamId_key` (`matchId`, `teamId`),
  KEY `MatchLineup_matchId_idx` (`matchId`),
  KEY `MatchLineup_teamId_idx` (`teamId`),
  CONSTRAINT `MatchLineup_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MatchLineup_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MatchLineup_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
