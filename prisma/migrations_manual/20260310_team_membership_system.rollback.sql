ALTER TABLE `User`
  ADD COLUMN `teamId` VARCHAR(191) NULL,
  ADD COLUMN `teamJoinedAt` DATETIME(3) NULL;

UPDATE `User` u
INNER JOIN `TeamMember` tm
  ON tm.`userId` = u.`id`
  AND tm.`leftAt` IS NULL
SET
  u.`teamId` = tm.`teamId`,
  u.`teamJoinedAt` = tm.`joinedAt`;

CREATE INDEX `User_teamId_idx` ON `User`(`teamId`);

ALTER TABLE `User`
  ADD CONSTRAINT `User_teamId_fkey`
  FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE `TeamJoinRequest`;
DROP TABLE `TeamInvite`;
DROP TABLE `TeamMember`;
