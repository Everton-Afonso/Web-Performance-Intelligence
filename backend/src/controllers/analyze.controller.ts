import type { Request, Response } from "express";
import type { AnalysisService } from "../services/analysis.service.js";
import type { AnalysisCache } from "../services/analysis-cache.js";
import { analyzeRequestSchema } from "../validators/analysis.schema.js";
import { parseUrlOrThrow } from "../validators/url.validator.js";
import type { AnalysisResult } from "../types/analysis.js";

export class AnalyzeController {
  constructor(
    private readonly service: AnalysisService,
    private readonly cache: AnalysisCache<AnalysisResult>
  ) {}

  async analyze(req: Request, res: Response): Promise<void> {
    const parsed = analyzeRequestSchema.parse(req.body);
    const url = parseUrlOrThrow(parsed.url);

    if (parsed.strategy === "both") {
      const result = await this.service.analyzeBoth(url);
      res.status(200).json(result);
      return;
    }

    const cached = this.cache.get(url, parsed.strategy);
    if (cached.cached && !parsed.deep) {
      res.status(200).json(cached.value);
      return;
    }

    const result = await this.service.analyze({ url, strategy: parsed.strategy, deep: parsed.deep });
    if (!parsed.deep) {
      this.cache.set(url, parsed.strategy, result);
    }
    res.status(200).json(result);
  }
}