ALTER TABLE `User`
    ADD COLUMN `googleId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `User_googleId_key` ON `User`(`googleId`);
