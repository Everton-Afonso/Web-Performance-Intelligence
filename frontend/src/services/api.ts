import type {
  AlertRecord,
  AnalysisBothResult,
  AnalysisRecord,
  AnalysisResult,
  AnalysisSummary,
  ComparisonResult,
  GoalRecord,
  GoalOperator,
  MonitorRecord,
  ProjectRecord,
  RequestStrategy,
  SiteRecord,
  Strategy
} from "@/types/analysis";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.") {
    super(message);
    this.name = "NetworkError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const body = JSON.parse(text) as { error?: string };
      if (typeof body.error === "string" && body.error.length > 0) {
        return body.error;
      }
    } catch {
      return `Erro ${res.status} ao executar a solicitação.`;
    }
    return `Erro ${res.status} ao executar a solicitação.`;
  } catch {
    return `Erro ${res.status} ao executar a solicitação.`;
  }
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init
    });
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) {
    throw new ApiRequestError(res.status, await parseError(res));
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    // Return the raw HTML string; callers handle it directly.
    return (await res.text()) as unknown as T;
  }
  return (await res.json()) as T;
}

// ──────────────── V1 core ────────────────

export function analyzeUrl(url: string, strategy: RequestStrategy): Promise<AnalysisResult | AnalysisBothResult> {
  return fetchJson<AnalysisResult | AnalysisBothResult>("/analyze", {
    method: "POST",
    body: JSON.stringify({ url, strategy })
  });
}

// ──────────────── V2 sites ────────────────

export function listSites(): Promise<SiteRecord[]> {
  return fetchJson<SiteRecord[]>("/sites");
}

export function createSite(name: string, url: string): Promise<SiteRecord> {
  return fetchJson<SiteRecord>("/sites", {
    method: "POST",
    body: JSON.stringify({ name, url })
  });
}

export function getSiteAnalyses(
  siteId: string,
  params?: { strategy?: Strategy; from?: string; to?: string; limit?: number }
): Promise<{ site: SiteRecord; analyses: AnalysisSummary[] }> {
  const query = new URLSearchParams();
  if (params?.strategy) query.set("strategy", params.strategy);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  const qs = query.toString();
  return fetchJson(`/sites/${siteId}/analyses${qs ? `?${qs}` : ""}`);
}

export function getAnalysisById(id: string): Promise<AnalysisResult> {
  return fetchJson<AnalysisRecord>(`/analyses/${id}`).then(toAnalysisResult);
}

/** Maps the persisted AnalysisRecord into the V1 AnalysisResult shape. */
function toAnalysisResult(rec: AnalysisRecord): AnalysisResult {
  return {
    id: rec.id,
    requestedUrl: rec.url,
    finalUrl: rec.finalUrl,
    strategy: rec.strategy,
    analyzedAt: rec.analyzedAt,
    performanceScore: rec.score,
    metrics: rec.metrics,
    audits: rec.audits,
    failedAuditsCount: rec.audits.length,
    highImpactCount: rec.audits.filter((a) => a.impact === "high").length,
    warnings: [],
    siteId: rec.siteId,
    site: rec.site,
    fieldData: rec.fieldData,
    recommendations: rec.recommendations
  };
}

export function compareAnalyses(currentId: string, baselineAnalysisId: string): Promise<ComparisonResult> {
  return fetchJson(`/analyses/${currentId}/compare`, {
    method: "POST",
    body: JSON.stringify({ baselineAnalysisId })
  });
}

/**
 * Fetches the HTML report as a string. Callers typically create a Blob and
 * open it in a new tab/window.
 */
export function generateReport(analysisId: string, baselineAnalysisId?: string): Promise<string> {
  return fetchJson(`/reports/${analysisId}`, {
    method: "POST",
    body: JSON.stringify({ baselineAnalysisId })
  });
}

// ──────────────── V4 Projects ────────────────

export function listProjects(): Promise<ProjectRecord[]> {
  return fetchJson("/projects");
}

export function createProject(name: string): Promise<ProjectRecord> {
  return fetchJson("/projects", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export function getProject(id: string): Promise<ProjectRecord> {
  return fetchJson(`/projects/${id}`);
}

// ──────────────── V4 Monitoring ────────────────

export function listMonitors(): Promise<MonitorRecord[]> {
  return fetchJson("/monitoring");
}

export function createMonitor(siteId: string, strategy: Strategy, intervalHours: number): Promise<MonitorRecord> {
  return fetchJson("/monitoring", {
    method: "POST",
    body: JSON.stringify({ siteId, strategy, intervalHours })
  });
}

export function toggleMonitor(id: string): Promise<MonitorRecord> {
  return fetchJson(`/monitoring/${id}/toggle`, { method: "POST" });
}

export function runMonitorNow(id: string): Promise<{ analysisId: string; alertsCreated: number }> {
  return fetchJson(`/monitoring/${id}/run`, { method: "POST" });
}

export function deleteMonitor(id: string): Promise<void> {
  return fetchJson(`/monitoring/${id}`, { method: "DELETE" });
}

// ──────────────── V4 Alerts ────────────────

export function listAlerts(options?: { siteId?: string; unreadOnly?: boolean }): Promise<AlertRecord[]> {
  const query = new URLSearchParams();
  if (options?.siteId) query.set("siteId", options.siteId);
  if (options?.unreadOnly) query.set("unread", "true");
  const qs = query.toString();
  return fetchJson(`/alerts${qs ? `?${qs}` : ""}`);
}

export function unreadAlertsCount(): Promise<{ unread: number }> {
  return fetchJson("/alerts/count");
}

export function markAlertRead(id: string): Promise<AlertRecord> {
  return fetchJson(`/alerts/${id}/read`, { method: "POST" });
}

// ──────────────── V4 Goals ────────────────

export function listGoalsBySite(siteId: string): Promise<GoalRecord[]> {
  return fetchJson(`/sites/${siteId}/goals`);
}

export function upsertGoal(siteId: string, metric: string, target: number, operator: GoalOperator): Promise<GoalRecord> {
  return fetchJson("/goals", {
    method: "POST",
    body: JSON.stringify({ siteId, metric, target, operator })
  });
}

export function deleteGoal(siteId: string, goalId: string): Promise<void> {
  return fetchJson(`/sites/${siteId}/goals/${goalId}`, { method: "DELETE" });
}

export { API_BASE };