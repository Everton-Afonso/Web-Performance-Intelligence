import "dotenv/config";
import { createApp } from "./app.js";
import { PageSpeedService } from "./services/pagespeed/client.js";
import { AnalysisService } from "./services/analysis.service.js";
import { AnalysisCache } from "./services/analysis-cache.js";
import type { AnalysisResult } from "./types/analysis.js";

function readConfig() {
  const port = Number(process.env.PORT ?? 3000);
  const apiUrl = process.env.PAGESPEED_API_URL ?? "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const apiKey = process.env.PAGESPEED_API_KEY ?? "";
  const timeoutMs = Number(process.env.PAGESPEED_TIMEOUT_MS ?? 60000);
  const corsOrigin = process.env.CORS_ORIGIN ?? "*";

  return { port, apiUrl, apiKey, timeoutMs, corsOrigin };
}

function bootstrap() {
  const config = readConfig();

  const pageSpeed = new PageSpeedService({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    timeoutMs: config.timeoutMs
  });

  const service = new AnalysisService(pageSpeed);
  const cache = new AnalysisCache<AnalysisResult>({ ttlMs: 5 * 60 * 1000 });

  const app = createApp({ service, cache, corsOrigin: config.corsOrigin });

  return app.listen(config.port, () => {
    console.log(`[wpintel] API listening on http://localhost:${config.port}`);
  });
}

const server = bootstrap();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}