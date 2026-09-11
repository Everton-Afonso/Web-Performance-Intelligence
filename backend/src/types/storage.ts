/**
 * Domain types for V2: persistence, field data (CrUX), comparison and reports.
 */

import type { Audit, Metric, Strategy } from "./analysis.js";

export interface SiteRecord {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
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
  upsertSite(input: { name: string; url: string }): Promise<SiteRecord>;
  getSites(): Promise<SiteRecord[]>;
  getSiteById(id: string): Promise<SiteRecord | null>;
  createAnalysis(input: CreateAnalysisInput): Promise<AnalysisRecord>;
  getAnalysisById(id: string): Promise<AnalysisRecord | null>;
  listAnalysesBySite(
    siteId: string,
    options?: { strategy?: Strategy; from?: string; to?: string; limit?: number }
  ): Promise<AnalysisSummary[]>;
  createComparison(input: CreateComparisonInput): Promise<ComparisonResult>;
}

/** Optional gateway used by AnalysisService; V1 flows may omit it. */
export interface AnalysisPersistence {
  readonly repository: Repository;
}

export type { Strategy };