/**
 * Frontend-side contract of the backend analysis result.
 * Mirrors backend types (src/types/analysis.ts).
 */

export type Strategy = "mobile" | "desktop";

export type MetricStatus = "good" | "needs-improvement" | "poor";

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
  unit: string;
  status: MetricStatus | null;
  displayValue: string;
  description?: string;
}

export type AuditSeverity = "P0" | "P1" | "P2";

export interface Audit {
  auditId: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  numericValue: number | null;
  severity: AuditSeverity;
  impact: "high" | "medium" | "low";
}

export interface AnalysisResult {
  id: string;
  requestedUrl: string;
  finalUrl: string;
  strategy: Strategy;
  analyzedAt: string;
  performanceScore: number | null;
  metrics: Metric[];
  audits: Audit[];
  failedAuditsCount: number;
  highImpactCount: number;
  warnings: string[];
}

export interface HealthResponse {
  status: "ok";
  uptimeSec: number;
  timestamp: string;
  version: string;
}

export interface ApiError {
  error: string;
}