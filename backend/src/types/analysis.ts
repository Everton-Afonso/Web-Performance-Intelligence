/**
 * Domain types produced by the backend (V1).
 *
 * These types are the contract shared with the frontend. They are kept
 * independent from the PageSpeed wire format so the Performance Engine can
 * evolve (CrUX, comparisons, AI) without breaking the API contract.
 */

import type { FieldData, Recommendation } from "./storage.js";

export type Strategy = "mobile" | "desktop";

/** Strategy accepted by the API. "both" runs mobile + desktop together (PSI-style). */
export type RequestStrategy = Strategy | "both";

export type MetricStatus = "good" | "needs-improvement" | "poor";

export type MetricUnit = "ms" | "s" | "score" | "";

export type MetricName =
  | "LCP"
  | "INP"
  | "CLS"
  | "FCP"
  | "TTFB"
  | "TBT"
  | "SI"
  | "performance-score";

export interface Metric {
  id: MetricName;
  name: string;
  value: number | null;
  unit: MetricUnit;
  status: MetricStatus | null;
  /** human readable value with unit, e.g. "1.2 s" or "0.31" */
  displayValue: string;
  description?: string;
}

/** Input describing a metric before normalization (raw extraction). */
export interface MetricSource {
  id: MetricName;
  name: string;
  value: number | null;
  unit: MetricUnit;
  description?: string;
}

export type AuditSeverity = "P0" | "P1" | "P2";

export interface Audit {
  auditId: string;
  title: string;
  description: string;
  score: number | null;
  /** Original human value from Lighthouse, e.g. "14,890 ms" */
  displayValue?: string;
  numericValue: number | null;
  /** Metric the audit contributes to, when mappable */
  metric?: MetricName;
  severity: AuditSeverity;
  impact: "high" | "medium" | "low";
}

export interface AnalysisRequest {
  url: string;
  strategy: Strategy;
}

export interface AnalysisResult {
  id: string;
  requestedUrl: string;
  finalUrl: string;
  strategy: Strategy;
  analyzedAt: string;
  performanceScore: number | null;
  metrics: Metric[];
  audits: Audit[]; // sorted by impact/severity
  failedAuditsCount: number;
  highImpactCount: number;
  warnings: string[];
  /** Populated only when a repository is configured (V2). */
  siteId?: string;
  site?: {
    id: string;
    name: string;
    url: string;
  };
  /** Field (CrUX) data collected for this URL origin. V2. */
  fieldData?: FieldData | null;
  /** Diagnostic recommendations. V3 (always computed; persisted when repository present). */
  recommendations?: Recommendation[];
}

/**
 * Combined mobile + desktop result (PSI-style), returned when the API is
 * called with strategy "both". Each strategy keeps its own metrics/audits.
 */
export interface AnalysisBothResult {
  requestedUrl: string;
  finalUrl: string;
  analyzedAt: string;
  mobile: AnalysisResult;
  desktop: AnalysisResult;
  site?: { id: string; name: string; url: string };
}

export interface HealthResponse {
  status: "ok";
  uptimeSec: number;
  timestamp: string;
  version: string;
}