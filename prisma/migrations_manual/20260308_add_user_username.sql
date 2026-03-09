ALTER TABLE `User`
    ADD COLUMN `username` VARCHAR(191) NULL;

UPDATE `User`
SET `username` = LOWER(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(TRIM(COALESCE(`fullName`, 'user')), ' ', '.'),
                '@',
                '.'
            ),
            '/',
            '.'
        ),
        '\\',
        '.'
    )
)
WHERE `username` IS NULL OR `username` = '';

UPDATE `User` u
JOIN (
    SELECT `id`, CONCAT(`username`, '.', ROW_NUMBER() OVER (PARTITION BY `username` ORDER BY `createdAt`, `id`)) AS `nextUsername`
    FROM `User`
) dedupe ON dedupe.`id` = u.`id`
SET u.`username` = dedupe.`nextUsername`
WHERE EXISTS (
    SELECT 1
    FROM `User` other
    WHERE other.`username` = u.`username`
      AND other.`id` <> u.`id`
);

ALTER TABLE `User`
    MODIFY COLUMN `username` VARCHAR(191) NOT NULL,
    ADD UNIQUE INDEX `User_username_key` (`username`);
