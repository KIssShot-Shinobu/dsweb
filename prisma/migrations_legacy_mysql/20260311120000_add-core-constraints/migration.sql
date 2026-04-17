-- Patch 1: Tournament creator tracking
ALTER TABLE `Tournament` ADD COLUMN `createdById` VARCHAR(191) NULL;

UPDATE `Tournament`
SET `createdById` = COALESCE(
  (SELECT `id` FROM `User` WHERE `role` IN ('ADMIN', 'FOUNDER') ORDER BY `createdAt` ASC LIMIT 1),
  (SELECT `id` FROM `User` ORDER BY `createdAt` ASC LIMIT 1)
)
WHERE `createdById` IS NULL;

ALTER TABLE `Tournament` MODIFY `createdById` VARCHAR(191) NOT NULL;
ALTER TABLE `Tournament` ADD CONSTRAINT `Tournament_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX `Tournament_createdById_idx` ON `Tournament`(`createdById`);

-- Patch 2: TeamInvite unique constraint
DROP INDEX `TeamInvite_teamId_userId_status_key` ON `TeamInvite`;
CREATE UNIQUE INDEX `TeamInvite_teamId_userId_key` ON `TeamInvite`(`teamId`, `userId`);

-- Patch 3: GameProfile unique constraint
DROP INDEX `GameProfile_gameId_key` ON `GameProfile`;
CREATE UNIQUE INDEX `GameProfile_gameType_gameId_key` ON `GameProfile`(`gameType`, `gameId`);

-- Patch 4: Treasury currency
ALTER TABLE `Treasury` ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR';

-- Patch 5: Notification performance index
CREATE INDEX `Notification_userId_createdAt_idx` ON `Notification`(`userId`, `createdAt`);
