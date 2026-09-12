/**
 * Frontend-side contracts shared with the backend API (V1 + V2).
 */

export type Strategy = "mobile" | "desktop";
/** Strategy selectable in the form; "both" returns mobile + desktop separately. */
export type RequestStrategy = Strategy | "both";
export type MetricStatus = "good" | "needs-improvement" | "poor";
export type MetricSourceLabel = "lab" | "field" | "wpt";
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
  source?: MetricSourceLabel;
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
  recommendations?: Recommendation[];
  needsWebPageTest?: boolean;
  webPageTest?: WebPageTestSummary | null;
}

export interface ApiError {
  error: string;
}

/** Combined mobile + desktop result (PSI-style), for strategy "both". */
export interface AnalysisBothResult {
  requestedUrl: string;
  finalUrl: string;
  analyzedAt: string;
  mobile: AnalysisResult;
  desktop: AnalysisResult;
  site?: Pick<SiteRecord, "id" | "name" | "url">;
}

// ──────────────── V2 ────────────────

export interface SiteRecord {
  id: string;
  name: string;
  url: string;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  sites?: SiteRecord[];
}

export type AlertType = "regression" | "goal";

export interface AlertRecord {
  id: string;
  siteId: string;
  type: AlertType;
  metric: string;
  severity: "high" | "medium" | "low";
  message: string;
  analysisId: string | null;
  read: boolean;
  createdAt: string;
  site?: Pick<SiteRecord, "id" | "name" | "url">;
}

export interface MonitorRecord {
  id: string;
  siteId: string;
  strategy: Strategy;
  intervalHours: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  site?: Pick<SiteRecord, "id" | "name" | "url">;
}

export interface MonitorRunRecord {
  id: string;
  monitorId: string;
  status: "ok" | "error";
  analysisId: string | null;
  alertsCreated: number;
  message: string | null;
  startedAt: string;
  durationMs: number;
}

export type GoalOperator = "lte" | "gte";

export interface GoalRecord {
  id: string;
  siteId: string;
  metric: string;
  target: number;
  operator: GoalOperator;
  createdAt: string;
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
  metricValues?: Record<string, number | null>;
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
  recommendations: Recommendation[];
  webPageTest?: WebPageTestSummary | null;
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

export type WptStatus = "pending" | "completed" | "error" | "timeout";

export interface WebPageTestRequestEvidence {
  url: string;
  host: string;
  contentType: string;
  startTime: number;
  loadTime: number;
  bytes: number;
  isThirdParty: boolean;
}

export interface WebPageTestSummary {
  testId: string;
  status: WptStatus;
  metrics: Metric[];
  requests: number;
  bytes: number;
  topRequests: WebPageTestRequestEvidence[];
  waterfallRef?: string;
  analyzedAt: string;
  location?: string;
  browser?: string;
}

/** V3: evidence-based recommendation. */
export interface Recommendation {
  targetType: "metric" | "audit" | "group";
  targetId: string;
  category: string;
  priority: "P0" | "P1" | "P2";
  title: string;
  description: string;
  cause: string;
  recommendedFix: string;
  expectedImpact: "high" | "medium" | "low";
  suggestedFix?: string;
  evidence: string[];
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
  | "projects"
  | "monitoring"
  | "alerts"
  | "siteDetail";