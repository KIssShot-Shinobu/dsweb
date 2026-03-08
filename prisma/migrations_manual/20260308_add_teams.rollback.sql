ALTER TABLE `User` DROP FOREIGN KEY `User_teamId_fkey`;
DROP INDEX `User_teamId_idx` ON `User`;
ALTER TABLE `User`
  DROP COLUMN `teamJoinedAt`,
  DROP COLUMN `teamId`;
DROP TABLE `Team`;
