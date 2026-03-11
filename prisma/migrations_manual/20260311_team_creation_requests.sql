CREATE TABLE `TeamCreationRequest` (
  `id` VARCHAR(191) NOT NULL,
  `requesterId` VARCHAR(191) NOT NULL,
  `reviewerId` VARCHAR(191) NULL,
  `teamName` VARCHAR(191) NOT NULL,
  `description` VARCHAR(500) NULL,
  `logoUrl` LONGTEXT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejectionReason` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,
  INDEX `TeamCreationRequest_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `TeamCreationRequest_requesterId_status_idx`(`requesterId`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TeamCreationRequest_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TeamCreationRequest_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
