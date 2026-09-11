/**
 * Orchestration of a full analysis (V1 + V2 additions).
 *
 * Responsibilities:
 * - drive the PageSpeed fetch
 * - translate API-level failures into controlled errors (RF-18 / RNF-06)
 * - normalize and classify metrics
 * - prioritize failed audits
 * - (V2) optionally fetch field data via CrUX
 * - (V2) optionally persist the analysis (repository)
 */

import type { AnalysisRequest, AnalysisResult, MetricSource, Strategy } from "../types/analysis.js";
import type { FieldData, Repository } from "../types/storage.js";
import { PageSpeedService } from "./pagespeed/client.js";
import { CruxService } from "./crux/crux.service.js";
import {
  extractFailedAudits,
  extractFinalUrl,
  extractPerformanceMetrics,
  extractPerformanceScore,
  extractWarnings
} from "./pagespeed/parser.js";
import { normalizeMetrics, normalizeMetric } from "./performance/normalizer.js";
import { countAudits, prioritizeAudits } from "./performance/prioritizer.js";
import { diagnose } from "./ai/diagnostic.js";
import { parseUrlOrThrow } from "../validators/url.validator.js";

export class PageSpeedRequestError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PageSpeedRequestError";
    this.status = status;
  }
}

const PERFORMANCE_SCORE_NAME = "Performance Score";

export interface AnalysisDeps {
  pageSpeed: PageSpeedService;
  repository?: Repository;
  crux?: CruxService;
}

export class AnalysisService {
  private readonly pageSpeed: PageSpeedService;
  private readonly repository?: Repository;
  private readonly crux?: CruxService;

  constructor(deps: PageSpeedService | AnalysisDeps) {
    if ("pageSpeed" in deps) {
      this.pageSpeed = deps.pageSpeed;
      this.repository = deps.repository;
      this.crux = deps.crux;
    } else {
      this.pageSpeed = deps;
    }
  }

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
    const scoreSource: MetricSource = {
      id: "performance-score",
      name: PERFORMANCE_SCORE_NAME,
      value: score,
      unit: "score"
    };

    const rawMetrics = extractPerformanceMetrics(lighthouse);
    const metrics = [normalizeMetric(scoreSource), ...normalizeMetrics(rawMetrics)];

    const parsedAudits = extractFailedAudits(lighthouse);
    const audits = prioritizeAudits(parsedAudits);
    const counts = countAudits(audits);

    // V3: evidence-based diagnostic recommendations
    const recommendations = diagnose({ metrics, audits });

    const analyzedAt = lighthouse?.fetchTime ?? response.analysisUTCTimestamp ?? new Date().toISOString();
    const fetchTime = analyzedAt;
    const finalUrl = extractFinalUrl(lighthouse, url);

    // V2: fetch field data when CrUX service is configured
    const fieldData: FieldData | null = this.crux
      ? await this.crux.fetchFieldData(url)
      : null;

    let resultId = response.id ?? `${url}::${strategy}`;
    let siteId: string | undefined;
    let siteInfo: { id: string; name: string; url: string } | undefined;

    // V2: persist when repository is configured
    if (this.repository) {
      let origin = url;
      try {
        origin = new URL(url).origin;
      } catch {
        // ignore
      }
      const site = await this.repository.upsertSite({ name: origin, url: origin });
      const labMetrics = metrics.filter((m) => m.id !== "performance-score");
      const created = await this.repository.createAnalysis({
        siteId: site.id,
        url,
        finalUrl,
        strategy,
        score: score,
        analyzedAt,
        fetchTime,
        fieldData,
        metrics: labMetrics,
        audits,
        recommendations
      });
      resultId = created.id;
      siteId = created.siteId;
      siteInfo = { id: created.site.id, name: created.site.name, url: created.site.url };
    }

    return {
      id: resultId,
      requestedUrl: url,
      finalUrl,
      strategy,
      analyzedAt,
      performanceScore: score,
      metrics,
      audits,
      failedAuditsCount: counts.total,
      highImpactCount: counts.highImpact,
      warnings: extractWarnings(lighthouse),
      siteId,
      site: siteInfo,
      fieldData: fieldData ?? undefined,
      recommendations
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