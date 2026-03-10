CREATE TABLE `TeamMember` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `teamId` VARCHAR(191) NOT NULL,
  `role` ENUM('CAPTAIN', 'VICE_CAPTAIN', 'PLAYER', 'COACH', 'MANAGER') NOT NULL DEFAULT 'PLAYER',
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `leftAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `TeamMember_userId_teamId_key`(`userId`, `teamId`),
  INDEX `TeamMember_teamId_leftAt_idx`(`teamId`, `leftAt`),
  INDEX `TeamMember_userId_leftAt_idx`(`userId`, `leftAt`),
  INDEX `TeamMember_teamId_role_leftAt_idx`(`teamId`, `role`, `leftAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TeamMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TeamMember_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeamInvite` (
  `id` VARCHAR(191) NOT NULL,
  `teamId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `invitedById` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `TeamInvite_teamId_userId_status_key`(`teamId`, `userId`, `status`),
  INDEX `TeamInvite_teamId_status_idx`(`teamId`, `status`),
  INDEX `TeamInvite_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TeamInvite_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TeamInvite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TeamInvite_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeamJoinRequest` (
  `id` VARCHAR(191) NOT NULL,
  `teamId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `TeamJoinRequest_teamId_userId_status_key`(`teamId`, `userId`, `status`),
  INDEX `TeamJoinRequest_teamId_status_idx`(`teamId`, `status`),
  INDEX `TeamJoinRequest_userId_status_idx`(`userId`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TeamJoinRequest_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TeamJoinRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `TeamMember` (`id`, `userId`, `teamId`, `role`, `joinedAt`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('tm_', SUBSTRING(REPLACE(UUID(), '-', ''), 1, 24)) AS `id`,
  `id` AS `userId`,
  `teamId`,
  'PLAYER' AS `role`,
  COALESCE(`teamJoinedAt`, `createdAt`) AS `joinedAt`,
  CURRENT_TIMESTAMP(3) AS `createdAt`,
  CURRENT_TIMESTAMP(3) AS `updatedAt`
FROM `User`
WHERE `teamId` IS NOT NULL;

ALTER TABLE `User` DROP FOREIGN KEY `User_teamId_fkey`;
DROP INDEX `User_teamId_idx` ON `User`;

ALTER TABLE `User`
  DROP COLUMN `teamJoinedAt`,
  DROP COLUMN `teamId`;
