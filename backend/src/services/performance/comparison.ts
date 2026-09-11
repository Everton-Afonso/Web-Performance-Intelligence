/**
 * Before/after comparison engine (V2).
 *
 * Pure functions: given two analyses they compute improvements/regressions
 * for the score and each metric. Separated from persistence so it is
 * trivially testable (RNF-08).
 */

import type {
  ComparisonResult,
  MetricComparison,
  AnalysisRecord
} from "../../types/storage.js";
import type { Metric } from "../../types/analysis.js";

const LOWER_IS_BETTER: Record<string, boolean> = {
  LCP: true,
  INP: true,
  CLS: true,
  FCP: true,
  TTFB: true,
  TBT: true,
  SI: true,
  "performance-score": false
};

const METRIC_PRIORITY = ["performance-score", "LCP", "INP", "CLS", "FCP", "TTFB", "TBT", "SI"];

function metricOf(metrics: Metric[], id: string): Metric | null {
  return metrics.find((m) => m.id === id) ?? null;
}

function directionFor(
  lowerIsBetter: boolean,
  before: number,
  after: number
): MetricComparison["direction"] {
  if (before === after) {
    return "unchanged";
  }
  const improved = lowerIsBetter ? after < before : after > before;
  return improved ? "improved" : "regressed";
}

/** Relative change in percent (after - before) / before * 100. */
function pctChange(before: number, after: number): number | null {
  if (before === 0) {
    return null;
  }
  return ((after - before) / before) * 100;
}

export function buildMetricComparison(
  id: string,
  name: string,
  before: Metric | null,
  after: Metric | null
): MetricComparison {
  const beforeValue = before?.value ?? null;
  const afterValue = after?.value ?? null;

  let delta: number | null = null;
  let pct: number | null = null;
  let direction: MetricComparison["direction"] = "unknown";

  if (beforeValue !== null && afterValue !== null) {
    delta = afterValue - beforeValue;
    pct = pctChange(beforeValue, afterValue);
    const lowerIsBetter = LOWER_IS_BETTER[id] ?? true;
    direction = directionFor(lowerIsBetter, beforeValue, afterValue);
  } else if (beforeValue === null && afterValue !== null) {
    direction = "improved"; // now we have data
  } else if (beforeValue !== null && afterValue === null) {
    direction = "regressed"; // lost data
  }

  return {
    metricId: id,
    name,
    before,
    after,
    delta,
    pctChange: pct,
    direction
  };
}

export function buildComparison(
  baseline: AnalysisRecord,
  current: AnalysisRecord,
  comparisonId?: string
): ComparisonResult {
  const metrics: MetricComparison[] = METRIC_PRIORITY.map((id) => {
    const before = metricOf(baseline.metrics, id);
    const after = metricOf(current.metrics, id);
    if (!before && !after) {
      return null;
    }
    return buildMetricComparison(id, before?.name ?? id, before, after);
  }).filter((m): m is MetricComparison => m !== null);

  const scoreBefore = baseline.score;
  const scoreAfter = current.score;
  const scoreDelta =
    scoreBefore !== null && scoreAfter !== null ? scoreAfter - scoreBefore : null;
  const scorePct =
    scoreBefore !== null && scoreBefore !== 0 && scoreAfter !== null
      ? ((scoreAfter - scoreBefore) / scoreBefore) * 100
      : null;

  const scoreDirection: ComparisonResult["scoreDirection"] =
    scoreBefore !== null && scoreAfter !== null
      ? directionFor(false, scoreBefore, scoreAfter)
      : "unknown";

  const result: Omit<ComparisonResult, "id" | "baselineAnalysisId" | "currentAnalysisId" | "createdAt"> = {
    scoreBefore,
    scoreAfter,
    scoreDelta,
    scorePct,
    scoreDirection,
    metrics
  };

  return {
    id: comparisonId ?? "",
    baselineAnalysisId: baseline.id,
    currentAnalysisId: current.id,
    createdAt: new Date().toISOString(),
    ...result
  };
}