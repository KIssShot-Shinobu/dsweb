-- AlterTable
ALTER TABLE `LeaderboardEntry` ADD COLUMN `placementMatchesPlayed` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `rankTier` VARCHAR(20) NOT NULL DEFAULT 'Gold';

UPDATE `LeaderboardEntry`
SET
    `placementMatchesPlayed` = `matchesPlayed`,
    `rankTier` = CASE
        WHEN `eloRating` >= 2100 THEN 'Diamond'
        WHEN `eloRating` >= 1800 THEN 'Platinum'
        WHEN `eloRating` >= 1500 THEN 'Gold'
        WHEN `eloRating` >= 1200 THEN 'Silver'
        ELSE 'Bronze'
    END;
