CREATE TABLE `PendingUpload` (
  `id` VARCHAR(191) NOT NULL,
  `purpose` ENUM('REGISTER_SCREENSHOT') NOT NULL,
  `status` ENUM('TEMP', 'CLAIMED', 'EXPIRED') NOT NULL DEFAULT 'TEMP',
  `storageKey` VARCHAR(191) NOT NULL,
  `originalName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(100) NOT NULL,
  `size` INT NOT NULL,
  `ipAddress` VARCHAR(64) NOT NULL,
  `claimedByUserId` VARCHAR(191) NULL,
  `claimedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PendingUpload_storageKey_key` (`storageKey`),
  INDEX `PendingUpload_ipAddress_createdAt_idx` (`ipAddress`, `createdAt`),
  INDEX `PendingUpload_status_expiresAt_idx` (`status`, `expiresAt`),
  INDEX `PendingUpload_claimedByUserId_idx` (`claimedByUserId`),
  CONSTRAINT `PendingUpload_claimedByUserId_fkey`
    FOREIGN KEY (`claimedByUserId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
);
