ALTER TABLE `Treasury`
  ADD COLUMN `category` VARCHAR(50) NOT NULL DEFAULT 'OTHER',
  ADD COLUMN `method` VARCHAR(30) NOT NULL DEFAULT 'OTHER',
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'CLEARED',
  ADD COLUMN `counterparty` VARCHAR(191) NULL,
  ADD COLUMN `referenceCode` VARCHAR(50) NULL;

CREATE INDEX `Treasury_createdAt_idx` ON `Treasury` (`createdAt`);
CREATE INDEX `Treasury_category_idx` ON `Treasury` (`category`);
CREATE INDEX `Treasury_status_idx` ON `Treasury` (`status`);
