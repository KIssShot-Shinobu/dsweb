/*
  Warnings:

  - A unique constraint covering the columns `[tournamentId,teamId]` on the table `TournamentParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `TournamentParticipant` ADD COLUMN `teamId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `TournamentParticipant_tournamentId_teamId_key` ON `TournamentParticipant`(`tournamentId`, `teamId`);

-- AddForeignKey
ALTER TABLE `TournamentParticipant` ADD CONSTRAINT `TournamentParticipant_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
