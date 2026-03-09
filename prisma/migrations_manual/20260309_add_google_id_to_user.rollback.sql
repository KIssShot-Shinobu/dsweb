DROP INDEX `User_googleId_key` ON `User`;

ALTER TABLE `User`
    DROP COLUMN `googleId`;
