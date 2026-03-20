ALTER TABLE `MatchReport`
  ADD COLUMN `evidenceUrls` JSON NULL;

ALTER TABLE `MatchDispute`
  ADD COLUMN `evidenceUrls` JSON NULL,
  ADD COLUMN `resolutionNote` VARCHAR(500) NULL,
  ADD COLUMN `resolutionEvidenceUrls` JSON NULL;
