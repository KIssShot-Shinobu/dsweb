-- DropForeignKey
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_userId_fkey`;

-- AlterTable
ALTER TABLE `AuditLog` MODIFY `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Tournament_status_startDate_idx` ON `Tournament`(`status`, `startDate`);

-- CreateIndex
CREATE INDEX `UserBadge_userId_idx` ON `UserBadge`(`userId`);

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `AuditLog_userId_idx` ON `AuditLog`(`userId`);

-- RedefineIndex
CREATE INDEX `GameProfile_userId_idx` ON `GameProfile`(`userId`);

-- RedefineIndex
CREATE INDEX `ReputationLog_userId_idx` ON `ReputationLog`(`userId`);
