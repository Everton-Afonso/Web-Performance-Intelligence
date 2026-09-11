import { Router } from "express";
import type { AnalysisService } from "../services/analysis.service.js";
import type { AnalysisCache } from "../services/analysis-cache.js";
import type { AnalysisResult } from "../types/analysis.js";
import { AnalyzeController } from "../controllers/analyze.controller.js";
import { rateLimit, type RateLimitOptions } from "../middleware/rate-limit.js";
import { asyncHandler } from "../middleware/async-handler.js";

const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  windowMs: 60_000,
  maxRequests: 20,
  message: "Muitas análises em pouco tempo. Aguarde um instante."
};

export function createAnalyzeRouter(
  service: AnalysisService,
  cache: AnalysisCache<AnalysisResult>,
  rateLimitOptions: RateLimitOptions = DEFAULT_RATE_LIMIT
): Router {
  const controller = new AnalyzeController(service, cache);
  const router = Router();

  router.post(
    "/analyze",
    rateLimit(rateLimitOptions),
    asyncHandler(controller.analyze.bind(controller))
  );

  return router;
}