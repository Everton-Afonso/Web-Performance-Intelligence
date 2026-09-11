/**
 * Defensive parser for the PageSpeed Insights v5 payload (RF-13).
 *
 * The external payload is messy and version-dependent, so extraction is
 * isolated here and never throws on unexpected structures. Values are read from
 * `lighthouseResult.audits` with a fallback to the aggregate `metrics` item.
 */

import type {
  MetricName,
  MetricSource,
  MetricUnit
} from "../../types/analysis.js";
import type {
  PageSpeedResponse,
  PsiAudit,
  PsiLighthouseResult
} from "../../types/pagespeed.js";

interface AuditReader {
  metric: MetricName;
  unit: MetricUnit;
  auditId?: string;
  /** id inside the aggregate "metrics" details item, when the audit id differs */
  metricsItemKey?: string;
}

const LAB_METRICS: AuditReader[] = [
  { metric: "LCP", unit: "ms", auditId: "largest-contentful-paint", metricsItemKey: "lcp" },
  { metric: "INP", unit: "ms", auditId: "interaction-to-next-paint", metricsItemKey: "inp" },
  { metric: "CLS", unit: "", auditId: "cumulative-layout-shift", metricsItemKey: "cls" },
  { metric: "FCP", unit: "ms", auditId: "first-contentful-paint", metricsItemKey: "fcp" },
  { metric: "TTFB", unit: "ms", auditId: "server-response-time" },
  { metric: "TBT", unit: "ms", auditId: "total-blocking-time", metricsItemKey: "tbt" },
  { metric: "SI", unit: "ms", auditId: "speed-index", metricsItemKey: "si" }
];

const METRIC_LABEL: Record<MetricName, string> = {
  "performance-score": "Performance Score",
  LCP: "Largest Contentful Paint",
  INP: "Interaction to Next Paint",
  CLS: "Cumulative Layout Shift",
  FCP: "First Contentful Paint",
  TTFB: "Time to First Byte",
  TBT: "Total Blocking Time",
  SI: "Speed Index"
};

export function metricName(id: MetricName): string {
  return METRIC_LABEL[id] ?? id;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractMetricsItem(lighthouse: PsiLighthouseResult): Record<string, unknown> | null {
  const metricsAudit: PsiAudit | undefined = lighthouse.audits?.["metrics"];
  const items = metricsAudit?.details?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const first = items[0];
  return typeof first === "object" && first !== null ? (first as Record<string, unknown>) : null;
}

/**
 * Reads a native numeric value from an audit. PSI exposes `numericValue` in the
 * metric's native unit (ms for temporal metrics, absolute for CLS).
 */
function readAuditValue(audit: PsiAudit | undefined): number | null {
  return asNumber(audit?.numericValue);
}

export function extractPerformanceMetrics(lighthouse: PsiLighthouseResult | undefined): MetricSource[] {
  if (!lighthouse) {
    return [];
  }

  const audits = lighthouse.audits ?? {};
  const metricsItem = extractMetricsItem(lighthouse);
  const metrics: MetricSource[] = [];

  for (const reader of LAB_METRICS) {
    const audit = reader.auditId ? audits[reader.auditId] : undefined;
    let value = readAuditValue(audit);

    if (value === null && reader.metricsItemKey && metricsItem) {
      value = asNumber(metricsItem[reader.metricsItemKey]);
    }

    metrics.push({
      id: reader.metric,
      name: metricName(reader.metric),
      value,
      unit: reader.unit,
      description: audit?.description
    });
  }

  return metrics;
}

export function extractPerformanceScore(lighthouse: PsiLighthouseResult | undefined): number | null {
  const score = lighthouse?.categories?.performance?.score;
  if (typeof score !== "number") {
    return null;
  }
  return Math.round(score * 100);
}

export interface ParsedAudit {
  auditId: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  numericValue: number | null;
}

/**
 * Collects all audits that point to a real problem (score < 1 and not
 * "notApplicable"/"informative"), as required by RF-07 and RF-16.
 */
export function extractFailedAudits(lighthouse: PsiLighthouseResult | undefined): ParsedAudit[] {
  if (!lighthouse?.audits) {
    return [];
  }

  const output: ParsedAudit[] = [];
  for (const [auditId, audit] of Object.entries(lighthouse.audits)) {
    const mode = audit.scoreDisplayMode;
    if (mode === "notApplicable" || mode === "informative" || mode === "manual") {
      continue;
    }
    const score = typeof audit.score === "number" ? audit.score : null;
    if (score !== null && score >= 1) {
      continue;
    }
    if (!audit.title) {
      continue;
    }

    const displayValue =
      typeof audit.displayValue === "string" && audit.displayValue.length > 0
        ? audit.displayValue
        : undefined;

    output.push({
      auditId,
      title: audit.title,
      description: audit.description ?? "",
      score,
      displayValue,
      numericValue: asNumber(audit.numericValue)
    });
  }

  return output;
}

export function extractFinalUrl(
  lighthouse: PsiLighthouseResult | undefined,
  requestedUrl: string
): string {
  return lighthouse?.finalUrl ?? requestedUrl;
}

export function extractWarnings(lighthouse: PsiLighthouseResult | undefined): string[] {
  if (!lighthouse?.runtimeError) {
    return [];
  }
  const code = lighthouse.runtimeError.code;
  return [code ? `Erro de runtime no Lighthouse: ${code}` : "Erro de runtime no Lighthouse."];
}

export type { PageSpeedResponse };