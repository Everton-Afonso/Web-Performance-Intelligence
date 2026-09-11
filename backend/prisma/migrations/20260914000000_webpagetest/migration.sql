-- AlterTable: source nas métricas/audits (lab/field/wpt)
ALTER TABLE "Metric" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'lab';
ALTER TABLE "Audit" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'lab';

-- AlterTable: WebPageTest avançado na Analysis
ALTER TABLE "Analysis" ADD COLUMN "webPageTestStatus" TEXT,
ADD COLUMN "webPageTestTestId" TEXT,
ADD COLUMN "webPageTestAnalyzedAt" TIMESTAMP(3);

-- CreateTable: resultado WebPageTest
CREATE TABLE "WebPageTestResult" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "topRequests" JSONB NOT NULL,
    "requests" INTEGER NOT NULL,
    "bytes" DOUBLE PRECISION NOT NULL,
    "waterfallRef" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebPageTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebPageTestResult_analysisId_key" ON "WebPageTestResult"("analysisId");
CREATE INDEX "WebPageTestResult_analysisId_idx" ON "WebPageTestResult"("analysisId");

-- AddForeignKey
ALTER TABLE "WebPageTestResult" ADD CONSTRAINT "WebPageTestResult_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;