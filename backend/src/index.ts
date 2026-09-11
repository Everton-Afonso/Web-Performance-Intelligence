import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app.js";
import { PageSpeedService } from "./services/pagespeed/client.js";
import { CruxService } from "./services/crux/crux.service.js";
import { AnalysisService } from "./services/analysis.service.js";
import { AnalysisCache } from "./services/analysis-cache.js";
import { PrismaRepository } from "./services/repository/prisma.repository.js";
import type { AnalysisResult } from "./types/analysis.js";

function readConfig() {
  const port = Number(process.env.PORT ?? 3000);
  const apiUrl = process.env.PAGESPEED_API_URL ?? "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const apiKey = process.env.PAGESPEED_API_KEY ?? "";
  const timeoutMs = Number(process.env.PAGESPEED_TIMEOUT_MS ?? 60000);
  const corsOrigin = process.env.CORS_ORIGIN ?? "*";
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const cruxApiUrl = process.env.CRUX_API_URL ?? "https://chromeuxreport.googleapis.com/v1/records:queryRecord";
  const cruxApiKey = process.env.CRUX_API_KEY ?? apiKey;

  return { port, apiUrl, apiKey, timeoutMs, corsOrigin, databaseUrl, cruxApiUrl, cruxApiKey };
}

function bootstrap() {
  const config = readConfig();

  const prisma = config.databaseUrl
    ? new PrismaClient({ datasources: { db: { url: config.databaseUrl } } })
    : undefined;

  const repository = prisma ? new PrismaRepository(prisma) : undefined;

  const pageSpeed = new PageSpeedService({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    timeoutMs: config.timeoutMs
  });

  const crux = config.cruxApiKey
    ? new CruxService({ apiUrl: config.cruxApiUrl, apiKey: config.cruxApiKey })
    : undefined;

  const service = new AnalysisService({
    pageSpeed,
    repository,
    crux
  });

  const cache = new AnalysisCache<AnalysisResult>({ ttlMs: 5 * 60 * 1000 });

  const app = createApp({
    service,
    cache,
    corsOrigin: config.corsOrigin,
    repository
  });

  return {
    server: app.listen(config.port, () => {
      console.log(`[wpintel] API listening on http://localhost:${config.port}`);
      console.log(`[wpintel] persistence: ${repository ? "enabled (PostgreSQL)" : "disabled (in-memory cache only)"}`);
      console.log(`[wpintel] CrUX field data: ${crux ? "enabled" : "disabled"}`);
    }),
    shutdown: async () => {
      if (prisma) {
        await prisma.$disconnect();
      }
    }
  };
}

const { server, shutdown } = bootstrap();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    server.close(async () => {
      await shutdown();
      process.exit(0);
    });
  });
}