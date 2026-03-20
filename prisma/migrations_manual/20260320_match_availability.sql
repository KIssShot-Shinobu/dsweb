CREATE TABLE `MatchAvailability` (
  `id` VARCHAR(191) NOT NULL,
  `matchId` VARCHAR(191) NOT NULL,
  `proposedById` VARCHAR(191) NOT NULL,
  `slots` JSON NOT NULL,
  `status` ENUM('PENDING','SELECTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `selectedSlot` DATETIME(3) NULL,
  `selectedById` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `MatchAvailability_matchId_status_idx` (`matchId`, `status`),
  KEY `MatchAvailability_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `MatchAvailability_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MatchAvailability_proposedById_fkey` FOREIGN KEY (`proposedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MatchAvailability_selectedById_fkey` FOREIGN KEY (`selectedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
