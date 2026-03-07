-- Rollback: restore legacy PENDING and REJECTED statuses in User.status enum
ALTER TABLE `User`
MODIFY `status` ENUM('PENDING', 'ACTIVE', 'REJECTED', 'BANNED') NOT NULL DEFAULT 'PENDING';
