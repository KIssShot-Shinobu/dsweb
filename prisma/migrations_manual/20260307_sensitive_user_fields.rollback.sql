DROP INDEX `User_accountNumberHash_idx` ON `User`;
DROP INDEX `User_phoneWhatsappHash_key` ON `User`;

ALTER TABLE `User`
  DROP COLUMN `accountNumberHash`,
  DROP COLUMN `accountNumber`,
  DROP COLUMN `phoneWhatsappHash`,
  MODIFY COLUMN `phoneWhatsapp` VARCHAR(191) NULL,
  MODIFY COLUMN `city` TEXT NULL,
  MODIFY COLUMN `twoFactorSecret` TEXT NULL;
