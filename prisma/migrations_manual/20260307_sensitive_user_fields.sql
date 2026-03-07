ALTER TABLE `User`
  MODIFY COLUMN `fullName` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `twoFactorSecret` VARCHAR(255) NULL,
  MODIFY COLUMN `phoneWhatsapp` VARCHAR(255) NULL,
  ADD COLUMN `phoneWhatsappHash` VARCHAR(64) NULL AFTER `phoneWhatsapp`,
  ADD COLUMN `accountNumber` VARCHAR(255) NULL AFTER `phoneWhatsappHash`,
  ADD COLUMN `accountNumberHash` VARCHAR(64) NULL AFTER `accountNumber`,
  MODIFY COLUMN `city` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `User_phoneWhatsappHash_key` ON `User`(`phoneWhatsappHash`);
CREATE INDEX `User_accountNumberHash_idx` ON `User`(`accountNumberHash`);
