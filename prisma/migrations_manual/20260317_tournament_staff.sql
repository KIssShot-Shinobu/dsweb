CREATE TABLE `TournamentStaff` (
  `id` VARCHAR(191) NOT NULL,
  `tournamentId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `role` ENUM('REFEREE','STAFF') NOT NULL DEFAULT 'REFEREE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `TournamentStaff_tournamentId_userId_key` (`tournamentId`,`userId`),
  KEY `TournamentStaff_tournamentId_role_idx` (`tournamentId`,`role`),
  KEY `TournamentStaff_userId_idx` (`userId`),
  CONSTRAINT `TournamentStaff_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TournamentStaff_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
