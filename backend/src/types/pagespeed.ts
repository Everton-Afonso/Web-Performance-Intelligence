/**
 * Minimal typings for the subset of the Google PageSpeed Insights v5
 * response that Performance Auditor consumes in V1.
 *
 * The external payload is large and unstable; normalizers work with these
 * structural slices defensively (see services/pagespeed/parser.ts).
 */

export interface PsiAuditItem {
  numericValue?: number;
  unit?: string;
  displayValue?: string;
  items?: Array<Record<string, unknown>>;
  score?: number | null;
  details?: {
    items?: Array<Record<string, unknown>>;
  };
}

export interface PsiAudit {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  numericValue?: number;
  displayValue?: string;
  details?: {
    items?: Array<Record<string, unknown>>;
    type?: string;
  };
  metrics?: Array<Record<string, unknown>>;
}

export interface PsiCategory {
  id?: string;
  title?: string;
  score?: number | null;
  displayValue?: string;
  auditRefs?: Array<{ id?: string; weight?: number; group?: string }>;
}

export interface PsiLighthouseResult {
  userAgent?: string;
  requestedUrl?: string;
  finalUrl?: string;
  fetchTime?: string;
  runtimeError?: Record<string, unknown>;
  lighthouseVersion?: string;
  categories?: {
    performance?: PsiCategory;
    accessibility?: PsiCategory;
    "best-practices"?: PsiCategory;
    seo?: PsiCategory;
    "pwa"?: PsiCategory;
  };
  audits?: Record<string, PsiAudit>;
}

export interface PsiError {
  code?: number;
  message?: string;
  status?: string;
  details?: unknown;
}

export interface PageSpeedResponse {
  error?: PsiError;
  lighthouseResult?: PsiLighthouseResult;
  loadingExperience?: unknown;
  originLoadingExperience?: unknown;
  analysisUTCTimestamp?: string;
  id?: string;
}

export interface PageSpeedClientOptions {
  apiUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}