/**
 * Orchestration of a full V1 analysis (RF-03/04/05/06/07/08/17/18).
 *
 * Responsibilities:
 * - drive the PageSpeed fetch
 * - translate API-level failures into controlled errors (RF-18 / RNF-06)
 * - normalize and classify metrics
 * - prioritize failed audits
 */

import type { AnalysisRequest, AnalysisResult, MetricSource, Strategy } from "../types/analysis.js";
import { PageSpeedService } from "./pagespeed/client.js";
import {
  extractFailedAudits,
  extractFinalUrl,
  extractPerformanceMetrics,
  extractPerformanceScore,
  extractWarnings
} from "./pagespeed/parser.js";
import { normalizeMetrics, normalizeMetric } from "./performance/normalizer.js";
import { countAudits, prioritizeAudits } from "./performance/prioritizer.js";
import { parseUrlOrThrow } from "../validators/url.validator.js";

export class PageSpeedRequestError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PageSpeedRequestError";
    this.status = status;
  }
}

const STRATEGY: Strategy[] = ["mobile", "desktop"];

const PERFORMANCE_SCORE_NAME = "Performance Score";

export class AnalysisService {
  constructor(private readonly pageSpeed: PageSpeedService) {}

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const url = parseUrlOrThrow(request.url);
    const strategy = this.normalizeStrategy(request.strategy);

    const response = await this.pageSpeed.run(url, strategy);

    if (response.error) {
      const message = this.describeApiError(response.error);
      throw new PageSpeedRequestError(message, 502);
    }

    const lighthouse = response.lighthouseResult;
    const score = extractPerformanceScore(lighthouse);
    const scoreUnit = "score" as const;
    const scoreSource: MetricSource = {
      id: "performance-score",
      name: PERFORMANCE_SCORE_NAME,
      value: score,
      unit: scoreUnit
    };

    const rawMetrics = extractPerformanceMetrics(lighthouse);
    const metrics = [normalizeMetric(scoreSource), ...normalizeMetrics(rawMetrics)];

    const parsedAudits = extractFailedAudits(lighthouse);
    const audits = prioritizeAudits(parsedAudits);
    const counts = countAudits(audits);

    const analyzedAt = lighthouse?.fetchTime ?? response.analysisUTCTimestamp ?? new Date().toISOString();

    return {
      id: response.id ?? `${url}::${strategy}`,
      requestedUrl: url,
      finalUrl: extractFinalUrl(lighthouse, url),
      strategy,
      analyzedAt,
      performanceScore: score,
      metrics,
      audits,
      failedAuditsCount: counts.total,
      highImpactCount: counts.highImpact,
      warnings: extractWarnings(lighthouse)
    };
  }

  private normalizeStrategy(value: unknown): Strategy {
    if (value === "mobile" || value === "desktop") {
      return value;
    }
    return "mobile";
  }

  private describeApiError(
    error: { code?: number; message?: string; status?: string }
  ): string {
    const messages: Record<number, string> = {
      400: "A URL informada é inválida para a análise.",
      403: "Acesso negado pela API PageSpeed. Verifique a chave de API.",
      429: "Limite de requisições excedido. Tente novamente em instantes.",
      500: "Erro interno na API PageSpeed.",
      503: "O serviço PageSpeed está indisponível. Tente novamente."
    };

    if (error.status === "FAILED_DOCUMENT_REQUEST") {
      return "Não foi possível acessar a página informada. Verifique se a URL está acessível publicamente.";
    }

    if (error.code && messages[error.code]) {
      return messages[error.code]!;
    }

    if (typeof error.message === "string" && error.message.length > 0) {
      return error.message;
    }

    return "Erro inesperado ao executar a análise PageSpeed.";
  }
}