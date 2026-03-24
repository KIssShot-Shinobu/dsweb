DROP INDEX `Treasury_status_idx` ON `Treasury`;
DROP INDEX `Treasury_category_idx` ON `Treasury`;
DROP INDEX `Treasury_createdAt_idx` ON `Treasury`;

ALTER TABLE `Treasury`
  DROP COLUMN `referenceCode`,
  DROP COLUMN `counterparty`,
  DROP COLUMN `status`,
  DROP COLUMN `method`,
  DROP COLUMN `category`;
