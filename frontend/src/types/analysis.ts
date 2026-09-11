/**
 * Frontend-side contracts shared with the backend API (V1 + V2).
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

export interface HealthResponse {
  status: "ok";
  uptimeSec: number;
  timestamp: string;
  version: string;
}

/** Matches the V1 AnalysisResult returned by POST /api/analyze. */
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
  siteId?: string;
  site?: Pick<SiteRecord, "id" | "name" | "url">;
  fieldData?: FieldData | null;
}

export interface ApiError {
  error: string;
}

// ──────────────── V2 ────────────────

export interface SiteRecord {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisSummary {
  id: string;
  url: string;
  finalUrl: string;
  strategy: Strategy;
  score: number | null;
  analyzedAt: string;
  failedAuditsCount: number;
  highImpactCount: number;
  site: Pick<SiteRecord, "id" | "name" | "url">;
}

export interface FieldData {
  origin: string;
  collectionPeriod?: string;
  metrics: Metric[];
}

export interface AnalysisRecord {
  id: string;
  siteId: string;
  site: Pick<SiteRecord, "id" | "name" | "url">;
  url: string;
  finalUrl: string;
  strategy: Strategy;
  score: number | null;
  analyzedAt: string;
  fetchTime: string;
  fieldData: FieldData | null;
  metrics: Metric[];
  audits: Audit[];
}

export interface MetricComparison {
  metricId: string;
  name: string;
  before: Metric | null;
  after: Metric | null;
  delta: number | null;
  pctChange: number | null;
  direction: "improved" | "regressed" | "unchanged" | "unknown";
}

export interface ComparisonResult {
  id: string;
  baselineAnalysisId: string;
  currentAnalysisId: string;
  createdAt: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreDelta: number | null;
  scorePct: number | null;
  scoreDirection: "improved" | "regressed" | "unchanged" | "unknown";
  metrics: MetricComparison[];
}

export type Screen =
  | "analyze"
  | "sites"
  | "siteDetail"
  | "history"
  | "analysisDetail"
  | "compare"
  | "report";