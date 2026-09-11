-- AlterTable: V3 recommendation intelligence fields
ALTER TABLE "Recommendation" ADD COLUMN "category" TEXT,
ADD COLUMN "cause" TEXT,
ADD COLUMN "recommendedFix" TEXT,
ADD COLUMN "expectedImpact" TEXT,
ADD COLUMN "evidence" JSONB;