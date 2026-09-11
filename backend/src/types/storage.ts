/**
 * Domain types for V2: persistence, field data (CrUX), comparison and reports.
 */

import type { Audit, Metric, Strategy } from "./analysis.js";

/** V3: evidence-based recommendation (never a hypothesis presented as fact). */
export interface Recommendation {
  targetType: "metric" | "audit" | "group";
  targetId: string;
  category: string;
  priority: "P0" | "P1" | "P2";
  title: string;
  /** Problem statement (description). */
  description: string;
  /** Probable cause, clearly marked as a hypothesis. */
  cause: string;
  recommendedFix: string;
  expectedImpact: "high" | "medium" | "low";
  /** Implementation suggestion/code, only when there is enough evidence. */
  suggestedFix?: string;
  /** Evidence list (audits/metrics that support the assessment). */
  evidence: string[];
}

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

export type MonitorStrategy = Strategy;

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

export type AlertType = "regression" | "goal";
export type AlertSeverity = "high" | "medium" | "low";

export interface AlertRecord {
  id: string;
  siteId: string;
  type: AlertType;
  metric: string;
  severity: AlertSeverity;
  message: string;
  analysisId: string | null;
  read: boolean;
  createdAt: string;
  site?: Pick<SiteRecord, "id" | "name" | "url">;
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

export interface CreateMonitorInput {
  siteId: string;
  strategy: Strategy;
  intervalHours: number;
  enabled?: boolean;
}

export interface CreateGoalInput {
  siteId: string;
  metric: string;
  target: number;
  operator: GoalOperator;
}

export type FieldMetric = Metric;

export interface FieldData {
  origin: string;
  /** aggregate collection period end date from CrUX, e.g. "2026-07-05" */
  collectionPeriod?: string;
  metrics: FieldMetric[];
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
}

export interface CreateAnalysisInput {
  siteId: string;
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

export interface MetricComparison {
  metricId: string;
  name: string;
  before: Metric | null;
  after: Metric | null;
  /** absolute numeric difference (after - before) */
  delta: number | null;
  /** relative change in percent (after - before) / before * 100 */
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

export interface CreateComparisonInput {
  baselineAnalysisId: string;
  currentAnalysisId: string;
  result: Omit<ComparisonResult, "id" | "baselineAnalysisId" | "currentAnalysisId" | "createdAt">;
}

export interface Repository {
  upsertSite(input: { name: string; url: string; projectId?: string | null }): Promise<SiteRecord>;
  getSites(): Promise<SiteRecord[]>;
  getSiteById(id: string): Promise<SiteRecord | null>;
  createAnalysis(input: CreateAnalysisInput): Promise<AnalysisRecord>;
  getAnalysisById(id: string): Promise<AnalysisRecord | null>;
  /** Returns the most recent analysis of the site+strategy before the given one. */
  getPreviousAnalysis(
    siteId: string,
    strategy: Strategy,
    beforeAnalysisId: string
  ): Promise<AnalysisRecord | null>;
  listAnalysesBySite(
    siteId: string,
    options?: { strategy?: Strategy; from?: string; to?: string; limit?: number }
  ): Promise<AnalysisSummary[]>;
  createComparison(input: CreateComparisonInput): Promise<ComparisonResult>;
  // V4 — Projects
  listProjects(): Promise<ProjectRecord[]>;
  createProject(name: string): Promise<ProjectRecord>;
  getProjectById(id: string): Promise<ProjectRecord | null>;
  listSitesByProject(projectId: string): Promise<SiteRecord[]>;
  // V4 — Monitoring
  listMonitors(): Promise<MonitorRecord[]>;
  getMonitorById(id: string): Promise<MonitorRecord | null>;
  createMonitor(input: CreateMonitorInput): Promise<MonitorRecord>;
  updateMonitor(id: string, data: Partial<{ enabled: boolean; lastRunAt: string; nextRunAt: string }>): Promise<MonitorRecord | null>;
  deleteMonitor(id: string): Promise<void>;
  listDueMonitors(now: Date): Promise<MonitorRecord[]>;
  // V4 — Alerts
  listAlerts(options?: { siteId?: string; unreadOnly?: boolean; limit?: number }): Promise<AlertRecord[]>;
  createAlert(input: Omit<AlertRecord, "id" | "createdAt" | "read">): Promise<AlertRecord>;
  markAlertRead(id: string): Promise<AlertRecord | null>;
  unreadAlertsCount(): Promise<number>;
  // V4 — Goals
  listGoalsBySite(siteId: string): Promise<GoalRecord[]>;
  upsertGoal(input: CreateGoalInput): Promise<GoalRecord>;
  deleteGoal(id: string): Promise<void>;
}

/** Optional gateway used by AnalysisService; V1 flows may omit it. */
export interface AnalysisPersistence {
  readonly repository: Repository;
}

export type { Strategy };