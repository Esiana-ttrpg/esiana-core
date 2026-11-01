-- Fold campaign audio contributor AND-gates into role grants without expanding access.
-- audio.upload is new; chapter/transcript grants keep only previously effective access.

CREATE TEMPORARY TABLE "AudioContributorDesired" (
  "campaignId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "want" BOOLEAN NOT NULL,
  "def" BOOLEAN NOT NULL
);

INSERT INTO "AudioContributorDesired" ("campaignId", "role", "capability", "want", "def")
WITH roles("role", assets_upload, audio_manage, audio_chapters, audio_transcripts, audio_upload) AS (
  SELECT 'GAMEMASTER', true, true, true, true, true
  UNION ALL SELECT 'WRITER', true, true, true, true, true
  UNION ALL SELECT 'PARTICIPANT', true, false, false, false, false
  UNION ALL SELECT 'OBSERVER', false, false, false, false, false
),
base AS (
  SELECT
    campaign."id" AS "campaignId",
    roles."role",
    roles.assets_upload AS def_assets_upload,
    roles.audio_manage AS def_audio_manage,
    roles.audio_chapters AS def_audio_chapters,
    roles.audio_transcripts AS def_audio_transcripts,
    roles.audio_upload AS def_audio_upload,
    COALESCE(settings."allowContributors", false) AS allow_contributors,
    COALESCE(settings."allowChapters", false) AS allow_chapters,
    COALESCE(settings."allowTranscripts", false) AS allow_transcripts
  FROM "Campaign" campaign
  CROSS JOIN roles
  LEFT JOIN "CampaignAudioSettings" settings ON settings."campaignId" = campaign."id"
),
effective AS (
  SELECT
    base.*,
    CASE
      WHEN assets_o.effect = 'GRANT' THEN true
      WHEN assets_o.effect = 'REVOKE' THEN false
      ELSE base.def_assets_upload
    END AS has_assets_upload,
    CASE
      WHEN manage_o.effect = 'GRANT' THEN true
      WHEN manage_o.effect = 'REVOKE' THEN false
      ELSE base.def_audio_manage
    END AS has_audio_manage,
    CASE
      WHEN chapters_o.effect = 'GRANT' THEN true
      WHEN chapters_o.effect = 'REVOKE' THEN false
      ELSE base.def_audio_chapters
    END AS has_audio_chapters,
    CASE
      WHEN transcripts_o.effect = 'GRANT' THEN true
      WHEN transcripts_o.effect = 'REVOKE' THEN false
      ELSE base.def_audio_transcripts
    END AS has_audio_transcripts
  FROM base
  LEFT JOIN "CampaignRoleCapabilityOverride" assets_o
    ON assets_o."campaignId" = base."campaignId"
    AND assets_o."role" = base."role"
    AND assets_o.capability = 'assets.upload'
  LEFT JOIN "CampaignRoleCapabilityOverride" manage_o
    ON manage_o."campaignId" = base."campaignId"
    AND manage_o."role" = base."role"
    AND manage_o.capability = 'audio.manage'
  LEFT JOIN "CampaignRoleCapabilityOverride" chapters_o
    ON chapters_o."campaignId" = base."campaignId"
    AND chapters_o."role" = base."role"
    AND chapters_o.capability = 'audio.chapters.edit'
  LEFT JOIN "CampaignRoleCapabilityOverride" transcripts_o
    ON transcripts_o."campaignId" = base."campaignId"
    AND transcripts_o."role" = base."role"
    AND transcripts_o.capability = 'audio.transcript.edit'
)
SELECT
  "campaignId",
  "role",
  'audio.upload',
  (has_assets_upload AND (has_audio_manage OR allow_contributors)),
  def_audio_upload
FROM effective
UNION ALL
SELECT
  "campaignId",
  "role",
  'audio.chapters.edit',
  (has_audio_chapters AND (has_audio_manage OR allow_chapters)),
  def_audio_chapters
FROM effective
UNION ALL
SELECT
  "campaignId",
  "role",
  'audio.transcript.edit',
  (has_audio_transcripts AND (has_audio_manage OR allow_transcripts)),
  def_audio_transcripts
FROM effective;

DELETE FROM "CampaignRoleCapabilityOverride"
WHERE ("campaignId", "role", "capability") IN (
  SELECT "campaignId", "role", "capability"
  FROM "AudioContributorDesired"
  WHERE "want" = "def"
);

INSERT INTO "CampaignRoleCapabilityOverride" ("id", "campaignId", "role", "capability", "effect", "createdAt", "updatedAt")
SELECT
  'audio-mig-' || "capability" || '-' || "campaignId" || '-' || "role",
  "campaignId",
  "role",
  "capability",
  CASE WHEN "want" THEN 'GRANT' ELSE 'REVOKE' END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "AudioContributorDesired"
WHERE "want" <> "def"
ON CONFLICT ("campaignId", "role", "capability") DO UPDATE SET
  "effect" = excluded."effect",
  "updatedAt" = CURRENT_TIMESTAMP;

DROP TABLE "AudioContributorDesired";

ALTER TABLE "CampaignAudioSettings" DROP COLUMN "allowContributors";
ALTER TABLE "CampaignAudioSettings" DROP COLUMN "allowChapters";
ALTER TABLE "CampaignAudioSettings" DROP COLUMN "allowTranscripts";
