/**
 * Severity rules (RF-23 / section 1.2 & 5 of the WebPageTest update).
 *
 * Decides when the deep WebPageTest investigation is suggested based only on
 * lab evidence (Lighthouse) of the current analysis. Kept as a pure function
 * so it is trivially testable.
 */

import type { Audit, Metric, MetricName } from "../../types/analysis.js";

const triggerMetrics: MetricName[] = ["LCP", "TTFB", "CLS", "INP"];

/** Returns true when the analysis has evidence that warrants a deep run. */
export function shouldSuggestWebPageTest(input: { metrics: Metric[]; audits: Audit[] }): boolean {
  const metricById = Object.fromEntries(input.metrics.map((m) => [m.id, m]));

  for (const id of triggerMetrics) {
    const metric = metricById[id];
    if (metric && (metric.status === "poor" || metric.status === "needs-improvement")) {
      return true;
    }
  }

  // Relevant rendering/loading problems flagged by Lighthouse.
  if (input.audits.some((a) => a.impact === "high")) {
    return true;
  }

  return false;
}