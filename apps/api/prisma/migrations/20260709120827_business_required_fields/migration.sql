-- Backfill NULLs before making columns required
UPDATE "Business" SET "description" = COALESCE(NULLIF("description", ''), 'No description provided') WHERE "description" IS NULL OR "description" = '';
UPDATE "Business" SET "phone" = COALESCE(NULLIF("phone", ''), 'N/A') WHERE "phone" IS NULL OR "phone" = '';
UPDATE "Business" SET "city" = COALESCE(NULLIF("city", ''), 'თბილისი') WHERE "city" IS NULL OR "city" = '';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "supportedBrands" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "supportedModels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "yearFrom" INTEGER,
ADD COLUMN IF NOT EXISTS "yearTo" INTEGER;

ALTER TABLE "Business" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL;
