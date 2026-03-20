ALTER TABLE `MatchDispute`
  DROP COLUMN `resolutionEvidenceUrls`,
  DROP COLUMN `resolutionNote`,
  DROP COLUMN `evidenceUrls`;

ALTER TABLE `MatchReport`
  DROP COLUMN `evidenceUrls`;
