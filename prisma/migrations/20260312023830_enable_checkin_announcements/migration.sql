-- AlterTable
ALTER TABLE `Tournament` ADD COLUMN `checkInAt` DATETIME(3) NULL,
    ADD COLUMN `checkInOpen` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `TournamentParticipant` ADD COLUMN `checkedInAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `TournamentAnnouncement` (
    `id` VARCHAR(191) NOT NULL,
    `tournamentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `pinned` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TournamentAnnouncement_tournamentId_createdAt_idx`(`tournamentId`, `createdAt`),
    INDEX `TournamentAnnouncement_tournamentId_pinned_idx`(`tournamentId`, `pinned`),
    INDEX `TournamentAnnouncement_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TournamentParticipant_tournamentId_checkedInAt_idx` ON `TournamentParticipant`(`tournamentId`, `checkedInAt`);

-- AddForeignKey
ALTER TABLE `TournamentAnnouncement` ADD CONSTRAINT `TournamentAnnouncement_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentAnnouncement` ADD CONSTRAINT `TournamentAnnouncement_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
