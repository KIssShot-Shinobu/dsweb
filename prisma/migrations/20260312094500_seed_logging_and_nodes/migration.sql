-- AlterTable
ALTER TABLE `Match` ADD COLUMN `matchVersion` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `TournamentParticipant` ADD COLUMN `seed` INTEGER NULL,
    ADD COLUMN `seededAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `BracketNode` (
    `id` VARCHAR(191) NOT NULL,
    `tournamentId` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `roundId` VARCHAR(191) NOT NULL,
    `slotIndex` INTEGER NOT NULL,
    `depth` INTEGER NOT NULL,
    `nextNodeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BracketNode_matchId_key`(`matchId`),
    INDEX `BracketNode_tournamentId_depth_idx`(`tournamentId`, `depth`),
    INDEX `BracketNode_roundId_slotIndex_idx`(`roundId`, `slotIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TournamentParticipant_tournamentId_seed_idx` ON `TournamentParticipant`(`tournamentId`, `seed`);

-- AddForeignKey
ALTER TABLE `BracketNode` ADD CONSTRAINT `BracketNode_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BracketNode` ADD CONSTRAINT `BracketNode_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BracketNode` ADD CONSTRAINT `BracketNode_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `TournamentRound`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BracketNode` ADD CONSTRAINT `BracketNode_nextNodeId_fkey` FOREIGN KEY (`nextNodeId`) REFERENCES `BracketNode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
