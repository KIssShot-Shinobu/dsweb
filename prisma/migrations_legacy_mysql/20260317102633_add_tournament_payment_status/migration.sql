-- AlterTable
ALTER TABLE `TournamentParticipant` ADD COLUMN `paymentProofUrl` VARCHAR(191) NULL,
    ADD COLUMN `paymentStatus` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'VERIFIED',
    ADD COLUMN `paymentVerifiedAt` DATETIME(3) NULL;
