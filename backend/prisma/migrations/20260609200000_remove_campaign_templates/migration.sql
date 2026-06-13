-- DropTable
DROP TABLE IF EXISTS "CampaignTemplate";

-- AlterTable (SQLite does not support DROP COLUMN IF EXISTS)
ALTER TABLE "Campaign" DROP COLUMN "templateSettings";
