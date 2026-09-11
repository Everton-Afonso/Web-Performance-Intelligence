/**
 * Classification rules for Core Web Vitals (RF-15 / RNF-08).
 *
 * Thresholds follow the document (section 2) and official web-vitals
 * conventions for FCP/TTFB/TBT/SI. They are centralised here so tests can
 * verify them in isolation and future versions can make them dynamic.
 */

import type { MetricName, MetricStatus } from "../../types/analysis.js";

export interface Threshold {
  goodMax: number;
  poorMin: number;
}

// Value are in the metric's native unit: seconds (LCP/FCP/TTFB/SI/TBT),
// milliseconds (INP), absolute (CLS), 0..100 (score).
export const THRESHOLDS: Partial<Record<MetricName, Threshold>> = {
  LCP: { goodMax: 2.5, poorMin: 4 },
  INP: { goodMax: 200, poorMin: 500 },
  CLS: { goodMax: 0.1, poorMin: 0.25 },
  FCP: { goodMax: 1.8, poorMin: 3 },
  TTFB: { goodMax: 0.8, poorMin: 1.8 },
  TBT: { goodMax: 200, poorMin: 600 },
  SI: { goodMax: 3.4, poorMin: 5.8 }
};

export function classifyMetric(name: MetricName, value: number): MetricStatus | null {
  const threshold = THRESHOLDS[name];
  if (!threshold) {
    return null;
  }
  if (value <= threshold.goodMax) {
    return "good";
  }
  if (value < threshold.poorMin) {
    return "needs-improvement";
  }
  return "poor";
}

export function classifyScore(score: number): MetricStatus {
  if (score >= 90) return "good";
  if (score >= 50) return "needs-improvement";
  return "poor";
}