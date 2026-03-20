CREATE TABLE `MatchMessage` (
  `id` VARCHAR(191) NOT NULL,
  `matchId` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NOT NULL,
  `content` VARCHAR(1000) NOT NULL,
  `attachmentUrls` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `editedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `MatchMessage_matchId_createdAt_idx` (`matchId`,`createdAt`),
  KEY `MatchMessage_senderId_idx` (`senderId`),
  CONSTRAINT `MatchMessage_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MatchMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
