ALTER TABLE `Tournament`
  ADD COLUMN `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta' AFTER `checkInAt`;
