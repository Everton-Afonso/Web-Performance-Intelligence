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

import type {
  AnalysisBothResult,
  AnalysisRequest,
  AnalysisResult,
  MetricSource,
  RequestStrategy,
  Strategy
} from "../types/analysis.js";
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
import { shouldSuggestWebPageTest } from "./webpagetest/severity.js";
import type { WebPageTestService } from "./webpagetest/client.js";
import type { WebPageTestSummary } from "../types/webpagetest.js";
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
  webPageTest?: WebPageTestService;
}

export class AnalysisService {
  private readonly pageSpeed: PageSpeedService;
  private readonly repository?: Repository;
  private readonly crux?: CruxService;
  private readonly webPageTest?: WebPageTestService;

  constructor(deps: PageSpeedService | AnalysisDeps) {
    if ("pageSpeed" in deps) {
      this.pageSpeed = deps.pageSpeed;
      this.repository = deps.repository;
      this.crux = deps.crux;
      this.webPageTest = deps.webPageTest;
    } else {
      this.pageSpeed = deps;
    }
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const url = parseUrlOrThrow(request.url);
    const strategy = this.normalizeStrategy(request.strategy as RequestStrategy);

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

    // Sources: lab metrics/audits from Lighthouse
    for (const m of metrics) m.source = "lab";
    for (const a of audits) a.source = "lab";

    // V1.1: severity rules suggest the deep WebPageTest investigation (RF-23)
    const needsWebPageTest = shouldSuggestWebPageTest({ metrics, audits });

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
    const warnings = extractWarnings(lighthouse);

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

    // V1.1: on-demand deep WebPageTest investigation (RF-20/22/23/26)
    let webPageTestSummary: WebPageTestSummary | null = null;
    if (request.deep && this.webPageTest && this.repository) {
      try {
        const dispatch = await this.webPageTest.dispatch(url, strategy);
        await this.repository.attachWebPageTestDispatch(resultId, dispatch.testId, "pending");
        webPageTestSummary = {
          testId: dispatch.testId,
          status: "pending",
          metrics: [],
          requests: 0,
          bytes: 0,
          topRequests: [],
          analyzedAt: new Date().toISOString()
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`WebPageTest indisponível: ${msg}`);
      }
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
      warnings,
      siteId,
      site: siteInfo,
      fieldData: fieldData ?? undefined,
      recommendations,
      needsWebPageTest,
      webPageTest: webPageTestSummary
    };
  }

  private normalizeStrategy(value: unknown): Strategy {
    if (value === "mobile" || value === "desktop") {
      return value;
    }
    return "mobile";
  }

  /**
   * PSI-style combined analysis: runs mobile + desktop in parallel and returns
   * each strategy with its own metrics/audits (never mixed).
   */
  async analyzeBoth(urlInput: string): Promise<AnalysisBothResult> {
    const url = parseUrlOrThrow(urlInput);
    const [mobile, desktop] = await Promise.all([
      this.analyze({ url, strategy: "mobile" }),
      this.analyze({ url, strategy: "desktop" })
    ]);

    return {
      requestedUrl: url,
      finalUrl: mobile.finalUrl,
      analyzedAt: new Date().toISOString(),
      mobile,
      desktop,
      site: mobile.site
    };
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