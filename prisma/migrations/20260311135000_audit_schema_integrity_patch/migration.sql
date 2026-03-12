-- DropIndex
DROP INDEX `TeamJoinRequest_teamId_userId_status_key` ON `TeamJoinRequest`;

-- CreateIndex
CREATE UNIQUE INDEX `TeamJoinRequest_teamId_userId_key` ON `TeamJoinRequest`(`teamId`, `userId`);

-- CreateIndex
CREATE UNIQUE INDEX `GameProfile_userId_gameType_key` ON `GameProfile`(`userId`, `gameType`);

-- CreateIndex
CREATE INDEX `TournamentParticipant_tournamentId_idx` ON `TournamentParticipant`(`tournamentId`);
