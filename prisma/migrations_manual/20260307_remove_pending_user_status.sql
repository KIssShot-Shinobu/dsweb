-- Remove legacy PENDING and REJECTED statuses from User.status
UPDATE `User`
SET `status` = 'ACTIVE'
WHERE `status` IN ('PENDING', 'REJECTED');

ALTER TABLE `User`
MODIFY `status` ENUM('ACTIVE', 'BANNED') NOT NULL DEFAULT 'ACTIVE';
