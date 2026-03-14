-- AlterTable
ALTER TABLE `TournamentParticipant` ADD COLUMN `guestName` VARCHAR(191) NULL,
    MODIFY `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `TournamentParticipant_tournamentId_guestName_key` ON `TournamentParticipant`(`tournamentId`, `guestName`);
