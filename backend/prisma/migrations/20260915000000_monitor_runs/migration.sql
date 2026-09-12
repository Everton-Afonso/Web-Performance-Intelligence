-- CreateTable: registro de execuções do monitoramento (V4)
CREATE TABLE "MonitorRun" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "analysisId" TEXT,
    "alertsCreated" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitorRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonitorRun_monitorId_createdAt_idx" ON "MonitorRun"("monitorId", "createdAt");

-- AddForeignKey
ALTER TABLE "MonitorRun" ADD CONSTRAINT "MonitorRun_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;