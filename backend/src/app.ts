import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import { createAnalyzeRouter } from "./routes/analyze.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import type { AnalysisService } from "./services/analysis.service.js";
import type { AnalysisCache } from "./services/analysis-cache.js";
import type { AnalysisResult } from "./types/analysis.js";
import type { Repository } from "./types/storage.js";
import type { RateLimitOptions } from "./middleware/rate-limit.js";
import { createSitesRouter } from "./routes/sites.routes.js";
import { createCompareRouter } from "./routes/compare.routes.js";
import { createReportRouter } from "./routes/report.routes.js";

export interface AppDependencies {
  service: AnalysisService;
  cache: AnalysisCache<AnalysisResult>;
  corsOrigin: string;
  /** Optional override for the analyze rate limit (used by tests). */
  analyzeRateLimit?: RateLimitOptions;
  /** V2 persistence backend; when absent, V2 endpoints are not mounted. */
  repository?: Repository;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: deps.corsOrigin }));

  const bodyParser: RequestHandler = express.json({ limit: "16kb" });
  app.use(bodyParser);

  app.use("/api", createHealthRouter());
  app.use("/api", createAnalyzeRouter(deps.service, deps.cache, deps.analyzeRateLimit));

  // V2 endpoints only when persistence is configured
  if (deps.repository) {
    app.use("/api", createSitesRouter(deps.repository));
    app.use("/api", createCompareRouter(deps.repository));
    app.use("/api", createReportRouter(deps.repository));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}