-- CreateIndex
CREATE INDEX `AuditLog_action_createdAt_idx` ON `AuditLog`(`action`, `createdAt`);

-- CreateIndex
CREATE INDEX `AuditLog_userId_createdAt_idx` ON `AuditLog`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `User_status_idx` ON `User`(`status`);

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);

-- CreateIndex
CREATE INDEX `User_lastActiveAt_idx` ON `User`(`lastActiveAt`);

-- CreateIndex
CREATE INDEX `User_createdAt_idx` ON `User`(`createdAt`);

-- RenameIndex
ALTER TABLE `TournamentParticipant` RENAME INDEX `TournamentParticipant_userId_fkey` TO `TournamentParticipant_userId_idx`;
