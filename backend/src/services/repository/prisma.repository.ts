import type {
  AlertRecord,
  AlertSeverity,
  AlertType,
  AnalysisRecord,
  AnalysisSummary,
  ComparisonResult,
  CreateAnalysisInput,
  CreateComparisonInput,
  CreateGoalInput,
  CreateMonitorInput,
  FieldData,
  GoalOperator,
  GoalRecord,
  MonitorRecord,
  ProjectRecord,
  Repository,
  SiteRecord
} from "../../types/storage.js";
import type { Audit, Metric, MetricName, MetricStatus, MetricUnit, Strategy } from "../../types/analysis.js";
import { formatValue } from "../performance/normalizer.js";

/**
 * Structural contract of the subset of PrismaClient used by this repository.
 * Both the production (Postgres) and test (SQLite) generated clients satisfy
 * it, which keeps the repository testable without a Postgres server.
 */
interface AnalysisDb {
  site: {
    upsert(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findMany(args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  };
  analysis: {
    create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    findMany(args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  webPageTestResult: {
    upsert(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  };
  comparison: {
    create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  project: {
    create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findMany(): Promise<Array<Record<string, unknown>>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  };
  monitor: {
    create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findMany(args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  alert: {
    create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findMany(args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  goal: {
    findMany(args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    upsert(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  };
}

const FIELD_ORDER = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;

function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

const NORMALIZED_BY_ID: Record<MetricName, { unit: MetricUnit; display: (v: number, unit: MetricUnit) => string }> = {
  LCP: { unit: "ms", display: (v, u) => formatValue(v, u, "LCP") },
  INP: { unit: "ms", display: (v, u) => formatValue(v, u, "INP") },
  CLS: { unit: "", display: (v, u) => formatValue(v, u, "CLS") },
  FCP: { unit: "ms", display: (v, u) => formatValue(v, u, "FCP") },
  TTFB: { unit: "ms", display: (v, u) => formatValue(v, u, "TTFB") },
  TBT: { unit: "ms", display: (v, u) => formatValue(v, u, "TBT") },
  SI: { unit: "ms", display: (v, u) => formatValue(v, u, "SI") },
  "performance-score": { unit: "score", display: (v, u) => formatValue(v, u, "performance-score") }
} as const;

function normalizeStoredMetric(name: string, value: number | null, unit: string, status: string | null, source: string): Metric {
  const id = name as MetricName;
  const cfg = NORMALIZED_BY_ID[id] ?? { unit: (unit || "") as MetricUnit, display: (v: number, u: MetricUnit) => String(v) };
  const safeUnit = unit === "" ? "" : (unit as MetricUnit);
  return {
    id,
    name,
    value: value ?? null,
    unit: cfg.unit ?? safeUnit,
    status: (status as MetricStatus) ?? null,
    displayValue:
      value === null ? "Não disponível" : cfg.display(value, cfg.unit ?? safeUnit),
    source: (source as Metric["source"]) ?? "lab"
  };
}

interface StoredRecommendation {
  targetType: string;
  targetId: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  cause: string;
  recommendedFix: string;
  expectedImpact: string;
  suggestedFix: string | null;
  evidence: unknown;
}

function toRecommendation(r: StoredRecommendation): import("../../types/storage.js").Recommendation {
  const array = Array.isArray(r.evidence)
    ? (r.evidence as unknown[]).map(String)
    : [];
  return {
    targetType: r.targetType as "metric" | "audit" | "group",
    targetId: r.targetId,
    category: r.category,
    priority: r.priority as "P0" | "P1" | "P2",
    title: r.title,
    description: r.description,
    cause: r.cause,
    recommendedFix: r.recommendedFix,
    expectedImpact: r.expectedImpact as "high" | "medium" | "low",
    suggestedFix: r.suggestedFix ?? undefined,
    evidence: array
  };
}

function toFieldData(row: {
  url: string;
  fieldLcp: number | null;
  fieldInp: number | null;
  fieldCls: number | null;
  fieldFcp: number | null;
  fieldTtfb: number | null;
}): FieldData | null {
  const byId: Record<(typeof FIELD_ORDER)[number], number | null> = {
    LCP: row.fieldLcp,
    INP: row.fieldInp,
    CLS: row.fieldCls,
    FCP: row.fieldFcp,
    TTFB: row.fieldTtfb
  };
  const hasAny = FIELD_ORDER.some((key) => byId[key] !== null);
  if (!hasAny) {
    return null;
  }
  return {
    origin: toOrigin(row.url),
    metrics: FIELD_ORDER.map((key) => {
      const value = byId[key] ?? null;
      const cfg = NORMALIZED_BY_ID[key];
      return {
        id: key,
        name: key,
        value,
        unit: cfg.unit,
        status: null,
        displayValue: value === null ? "Não disponível" : cfg.display(value, cfg.unit)
      };
    })
  };
}

function toSite(row: Record<string, unknown>): SiteRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    url: String(row.url),
    projectId: row.projectId ? String(row.projectId) : null,
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString()
  };
}

function toProject(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: (row.createdAt as Date).toISOString()
  };
}

function toMonitor(row: Record<string, unknown>): MonitorRecord {
  const site = row.site as Record<string, unknown> | undefined;
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    strategy: row.strategy as Strategy,
    intervalHours: row.intervalHours as number,
    enabled: Boolean(row.enabled),
    lastRunAt: row.lastRunAt ? (row.lastRunAt as Date).toISOString() : null,
    nextRunAt: row.nextRunAt ? (row.nextRunAt as Date).toISOString() : null,
    createdAt: (row.createdAt as Date).toISOString(),
    site: site ? { id: String(site.id), name: String(site.name), url: String(site.url) } : undefined
  };
}

function toAlert(row: Record<string, unknown>): AlertRecord {
  const site = row.site as Record<string, unknown> | undefined;
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    type: row.type as AlertType,
    metric: String(row.metric),
    severity: row.severity as AlertSeverity,
    message: String(row.message),
    analysisId: row.analysisId ? String(row.analysisId) : null,
    read: Boolean(row.read),
    createdAt: (row.createdAt as Date).toISOString(),
    site: site ? { id: String(site.id), name: String(site.name), url: String(site.url) } : undefined
  };
}

function toGoal(row: Record<string, unknown>): GoalRecord {
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    metric: String(row.metric),
    target: row.target as number,
    operator: row.operator as GoalOperator,
    createdAt: (row.createdAt as Date).toISOString()
  };
}

function toAnalysisRecord(row: Record<string, unknown>): AnalysisRecord {
  const site = row.site as Record<string, unknown>;
  const metrics = (row.metrics as unknown[]) ?? [];
  const audits = (row.audits as unknown[]) ?? [];
  const recommendations = (row.recommendations as unknown[]) ?? [];

  return {
    id: String(row.id),
    siteId: String(row.siteId),
    site: { id: String(site.id), name: String(site.name), url: String(site.url) },
    url: String(row.url),
    finalUrl: String(row.finalUrl),
    strategy: row.strategy as Strategy,
    score: (row.score as number) < 0 ? null : (row.score as number),
    analyzedAt: (row.analyzedAt as Date).toISOString(),
    fetchTime: (row.fetchTime as Date).toISOString(),
    fieldData: toFieldData({
      url: String(row.url),
      fieldLcp: (row.fieldLcp as number | null) ?? null,
      fieldInp: (row.fieldInp as number | null) ?? null,
      fieldCls: (row.fieldCls as number | null) ?? null,
      fieldFcp: (row.fieldFcp as number | null) ?? null,
      fieldTtfb: (row.fieldTtfb as number | null) ?? null
    }),
    metrics: metrics.map((m) => {
      const mm = m as Record<string, unknown>;
      return normalizeStoredMetric(String(mm.name), (mm.value as number | null) ?? null, String(mm.unit), (mm.status as string | null) ?? null, String(mm.source ?? "lab"));
    }),
    audits: audits.map((a) => {
      const aa = a as Record<string, unknown>;
      const result: Audit = {
        auditId: String(aa.auditId),
        title: String(aa.title),
        description: String(aa.description),
        score: (aa.score as number | null) ?? null,
        numericValue: (aa.numericValue as number | null) ?? null,
        displayValue: aa.displayValue ? String(aa.displayValue) : undefined,
        severity: aa.severity as Audit["severity"],
        impact: aa.impact as Audit["impact"],
        source: (aa.source as Audit["source"]) ?? "lab"
      };
      return result;
    }),
    recommendations: recommendations.map((r) =>
      toRecommendation(r as unknown as StoredRecommendation)
    ),
    webPageTest: row.webPageTestTestId
      ? toWebPageTestSummary(row)
      : null
  };
}

function toWebPageTestSummary(row: Record<string, unknown>): import("../../types/webpagetest.js").WebPageTestSummary {
  const results = (row.webPageTestResults as unknown[]) ?? [];
  const r = (results[0] as Record<string, unknown>) ?? {};
  const metrics = Array.isArray(r.metrics) ? (r.metrics as import("../../types/analysis.js").Metric[]) : [];
  const topRequests = Array.isArray(r.topRequests)
    ? (r.topRequests as import("../../types/webpagetest.js").WebPageTestRequestEvidence[])
    : [];
  const analyzed = r.analyzedAt as Date | undefined;
  return {
    testId: String(row.webPageTestTestId),
    status: (String(row.webPageTestStatus ?? r.status ?? "pending") as import("../../types/webpagetest.js").WptStatus),
    metrics,
    requests: Number(r.requests ?? 0),
    bytes: Number(r.bytes ?? 0),
    topRequests,
    waterfallRef: r.waterfallRef ? String(r.waterfallRef) : undefined,
    analyzedAt: (analyzed ?? new Date()).toISOString()
  };
}

const recommendationSelect = {
  select: {
    targetType: true,
    targetId: true,
    category: true,
    priority: true,
    title: true,
    description: true,
    cause: true,
    recommendedFix: true,
    expectedImpact: true,
    suggestedFix: true,
    evidence: true
  }
} as const;

/**
 * Prisma-based repository implementing the V2 persistence contract.
 * Accepts any Prisma client whose model surface matches `AnalysisDb`
 * (production Postgres or the SQLite test client).
 */
export class PrismaRepository implements Repository {
  constructor(private readonly db: AnalysisDb) {}

  async upsertSite(input: { name: string; url: string; projectId?: string | null }): Promise<SiteRecord> {
    const site = await this.db.site.upsert({
      where: { url: input.url },
      update: {
        name: input.name,
        ...(input.projectId !== undefined ? { projectId: input.projectId ?? null } : {})
      },
      create: {
        name: input.name,
        url: input.url,
        ...(input.projectId !== undefined && input.projectId ? { projectId: input.projectId } : {})
      }
    });
    return toSite(site);
  }

  async getSites(): Promise<SiteRecord[]> {
    const sites = await this.db.site.findMany();
    return sites.map(toSite);
  }

  async getSiteById(id: string): Promise<SiteRecord | null> {
    const site = await this.db.site.findUnique({ where: { id } });
    return site ? toSite(site) : null;
  }

  async createAnalysis(input: CreateAnalysisInput): Promise<AnalysisRecord> {
    const metricById = Object.fromEntries(input.metrics.map((m) => [m.id, m]));
    const analysis = await this.db.analysis.create({
      data: {
        siteId: input.siteId,
        url: input.url,
        finalUrl: input.finalUrl,
        strategy: input.strategy,
        score: input.score ?? -1,
        analyzedAt: new Date(input.analyzedAt),
        fetchTime: new Date(input.fetchTime),
        fieldLcp: input.fieldData?.metrics.find((m) => m.id === "LCP")?.value ?? null,
        fieldInp: input.fieldData?.metrics.find((m) => m.id === "INP")?.value ?? null,
        fieldCls: input.fieldData?.metrics.find((m) => m.id === "CLS")?.value ?? null,
        fieldFcp: input.fieldData?.metrics.find((m) => m.id === "FCP")?.value ?? null,
        fieldTtfb: input.fieldData?.metrics.find((m) => m.id === "TTFB")?.value ?? null,
        metrics: {
          create: input.metrics.map((m) => ({
            source: "lab",
            name: m.id,
            value: m.value,
            unit: m.unit,
            status: m.status
          }))
        },
        audits: {
          create: input.audits.map((a) => ({
            source: "lab",
            auditId: a.auditId,
            title: a.title,
            description: a.description,
            score: a.score,
            numericValue: a.numericValue,
            displayValue: a.displayValue ?? null,
            severity: a.severity,
            impact: a.impact
          }))
        },
        recommendations: {
          create: (input.recommendations ?? []).map((r) => ({
            targetType: r.targetType,
            targetId: r.targetId,
            category: r.category,
            priority: r.priority,
            title: r.title,
            description: r.description,
            cause: r.cause,
            recommendedFix: r.recommendedFix,
            expectedImpact: r.expectedImpact,
            suggestedFix: r.suggestedFix ?? null,
            evidence: r.evidence
          }))
        }
      },
      include: {
        site: { select: { id: true, name: true, url: true } },
        metrics: { select: { source: true, name: true, value: true, unit: true, status: true } },
        audits: { select: { source: true, auditId: true, title: true, description: true, score: true, numericValue: true, displayValue: true, severity: true, impact: true } },
        recommendations: recommendationSelect,
        webPageTestResults: { select: { testId: true, status: true, metrics: true, topRequests: true, requests: true, bytes: true, waterfallRef: true, analyzedAt: true } }
      }
    });
    void metricById;
    return toAnalysisRecord(analysis);
  }

  async getAnalysisById(id: string): Promise<AnalysisRecord | null> {
    const analysis = await this.db.analysis.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true, url: true } },
        metrics: { select: { source: true, name: true, value: true, unit: true, status: true } },
        audits: { select: { source: true, auditId: true, title: true, description: true, score: true, numericValue: true, displayValue: true, severity: true, impact: true } },
        recommendations: recommendationSelect,
        webPageTestResults: { select: { testId: true, status: true, metrics: true, topRequests: true, requests: true, bytes: true, waterfallRef: true, analyzedAt: true } }
      }
    });
    return analysis ? toAnalysisRecord(analysis) : null;
  }

  async listAnalysesBySite(
    siteId: string,
    options?: { strategy?: Strategy; from?: string; to?: string; limit?: number }
  ): Promise<AnalysisSummary[]> {
    const analyzedAt: Record<string, Date> = {};
    if (options?.from) {
      analyzedAt.gte = new Date(options.from);
    }
    if (options?.to) {
      analyzedAt.lte = new Date(options.to);
    }
    const where: Record<string, unknown> = { siteId };
    if (options?.strategy) {
      where.strategy = options.strategy;
    }
    if (analyzedAt.gte || analyzedAt.lte) {
      where.analyzedAt = analyzedAt;
    }

    const rows = await this.db.analysis.findMany({
      where,
      orderBy: { analyzedAt: "desc" },
      take: options?.limit ?? 25,
      include: {
        site: { select: { id: true, name: true, url: true } },
        audits: { select: { impact: true } }
      }
    });

    return rows.map((a) => {
      const site = a.site as Record<string, unknown>;
      const audits = (a.audits as Array<Record<string, unknown>>) ?? [];
      return {
        id: String(a.id),
        url: String(a.url),
        finalUrl: String(a.finalUrl),
        strategy: a.strategy as Strategy,
        score: (a.score as number) < 0 ? null : (a.score as number),
        analyzedAt: (a.analyzedAt as Date).toISOString(),
        failedAuditsCount: audits.length,
        highImpactCount: audits.filter((x) => x.impact === "high").length,
        site: { id: String(site.id), name: String(site.name), url: String(site.url) }
      };
    });
  }

  async createComparison(input: CreateComparisonInput): Promise<ComparisonResult> {
    const { result, baselineAnalysisId, currentAnalysisId } = input;
    const created = await this.db.comparison.create({
      data: {
        baselineAnalysisId,
        currentAnalysisId,
        results: result
      }
    });
    return {
      id: String(created.id),
      baselineAnalysisId,
      currentAnalysisId,
      createdAt: (created.createdAt as Date).toISOString(),
      ...result
    };
  }

  // ──────────────── V4 — Projects ────────────────

  async listProjects(): Promise<ProjectRecord[]> {
    const rows = await this.db.project.findMany();
    return rows.map(toProject);
  }

  async createProject(name: string): Promise<ProjectRecord> {
    const row = await this.db.project.create({ data: { name } });
    return toProject(row);
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    const row = await this.db.project.findUnique({ where: { id } });
    return row ? toProject(row) : null;
  }

  async listSitesByProject(projectId: string): Promise<SiteRecord[]> {
    const rows = await this.db.site.findMany({ where: { projectId } });
    return rows.map(toSite);
  }

  // ──────────────── V4 — Monitoring ────────────────

  async listMonitors(): Promise<MonitorRecord[]> {
    const rows = await this.db.monitor.findMany({
      include: { site: { select: { id: true, name: true, url: true } } }
    });
    return rows.map(toMonitor);
  }

  async getMonitorById(id: string): Promise<MonitorRecord | null> {
    const row = await this.db.monitor.findUnique({
      where: { id },
      include: { site: { select: { id: true, name: true, url: true } } }
    });
    return row ? toMonitor(row) : null;
  }

  async createMonitor(input: CreateMonitorInput): Promise<MonitorRecord> {
    const nextRunAt = new Date(Date.now() + input.intervalHours * 3600 * 1000);
    const row = await this.db.monitor.create({
      data: {
        siteId: input.siteId,
        strategy: input.strategy,
        intervalHours: input.intervalHours,
        enabled: input.enabled ?? true,
        nextRunAt
      },
      include: { site: { select: { id: true, name: true, url: true } } }
    });
    return toMonitor(row);
  }

  async updateMonitor(
    id: string,
    data: Partial<{ enabled: boolean; lastRunAt: string; nextRunAt: string }>
  ): Promise<MonitorRecord | null> {
    const payload: Record<string, unknown> = {};
    if (data.enabled !== undefined) payload.enabled = data.enabled;
    if (data.lastRunAt !== undefined) payload.lastRunAt = new Date(data.lastRunAt);
    if (data.nextRunAt !== undefined) payload.nextRunAt = new Date(data.nextRunAt);
    const row = await this.db.monitor.update({
      where: { id },
      data: payload,
      include: { site: { select: { id: true, name: true, url: true } } }
    });
    return toMonitor(row);
  }

  async deleteMonitor(id: string): Promise<void> {
    await this.db.monitor.delete({ where: { id } });
  }

  async listDueMonitors(now: Date): Promise<MonitorRecord[]> {
    const rows = await this.db.monitor.findMany({
      where: {
        enabled: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }]
      },
      include: { site: { select: { id: true, name: true, url: true } } }
    });
    return rows.map(toMonitor);
  }

  // ──────────────── V4 — Alerts ────────────────

  async listAlerts(options?: { siteId?: string; unreadOnly?: boolean; limit?: number }): Promise<AlertRecord[]> {
    const where: Record<string, unknown> = {};
    if (options?.siteId) where.siteId = options.siteId;
    if (options?.unreadOnly) where.read = false;
    const rows = await this.db.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      include: { site: { select: { id: true, name: true, url: true } } }
    });
    return rows.map(toAlert);
  }

  async createAlert(input: Omit<AlertRecord, "id" | "createdAt" | "read">): Promise<AlertRecord> {
    const row = await this.db.alert.create({
      data: {
        siteId: input.siteId,
        type: input.type,
        metric: input.metric,
        severity: input.severity,
        message: input.message,
        analysisId: input.analysisId ?? null
      },
      include: { site: { select: { id: true, name: true, url: true } } }
    });
    return toAlert(row);
  }

  async markAlertRead(id: string): Promise<AlertRecord | null> {
    const row = await this.db.alert.update({
      where: { id },
      data: { read: true },
      include: { site: { select: { id: true, name: true, url: true } } }
    });
    return toAlert(row);
  }

  async unreadAlertsCount(): Promise<number> {
    const count = await this.db.alert.findMany({
      where: { read: false },
      select: { id: true }
    });
    return count.length;
  }

  // ──────────────── V4 — Goals ────────────────

  async listGoalsBySite(siteId: string): Promise<GoalRecord[]> {
    const rows = await this.db.goal.findMany({ where: { siteId } });
    return rows.map(toGoal);
  }

  async upsertGoal(input: CreateGoalInput): Promise<GoalRecord> {
    const row = await this.db.goal.upsert({
      where: { siteId_metric: { siteId: input.siteId, metric: input.metric } },
      update: { target: input.target, operator: input.operator },
      create: input
    });
    return toGoal(row);
  }

  async deleteGoal(id: string): Promise<void> {
    await this.db.goal.delete({ where: { id } });
  }

  async getPreviousAnalysis(
    siteId: string,
    strategy: Strategy,
    beforeAnalysisId: string
  ): Promise<AnalysisRecord | null> {
    const rows = await this.db.analysis.findMany({
      where: { siteId, strategy },
      orderBy: { analyzedAt: "desc" },
      take: 5,
      include: {
        site: { select: { id: true, name: true, url: true } },
        metrics: { select: { source: true, name: true, value: true, unit: true, status: true } },
        audits: { select: { source: true, auditId: true, title: true, description: true, score: true, numericValue: true, displayValue: true, severity: true, impact: true } },
        recommendations: recommendationSelect,
        webPageTestResults: { select: { testId: true, status: true, metrics: true, topRequests: true, requests: true, bytes: true, waterfallRef: true, analyzedAt: true } }
      }
    });
    const index = rows.findIndex((r) => String(r.id) === beforeAnalysisId);
    const previous = index > 0 ? rows[index - 1] : null;
    return previous ? toAnalysisRecord(previous) : null;
  }

  // ──────────────── WebPageTest ────────────────

  async attachWebPageTestDispatch(
    analysisId: string,
    testId: string,
    status: string
  ): Promise<void> {
    await this.db.analysis.update({
      where: { id: analysisId },
      data: { webPageTestTestId: testId, webPageTestStatus: status }
    });
  }

  async saveWebPageTestResult(
    analysisId: string,
    summary: import("../../types/webpagetest.js").WebPageTestSummary
  ): Promise<void> {
    await this.db.webPageTestResult.upsert({
      where: { analysisId },
      create: {
        analysisId,
        testId: summary.testId,
        status: summary.status,
        metrics: summary.metrics,
        topRequests: summary.topRequests,
        requests: summary.requests,
        bytes: summary.bytes,
        waterfallRef: summary.waterfallRef ?? null
      },
      update: {
        testId: summary.testId,
        status: summary.status,
        metrics: summary.metrics,
        topRequests: summary.topRequests,
        requests: summary.requests,
        bytes: summary.bytes,
        waterfallRef: summary.waterfallRef ?? null
      }
    });
    await this.db.analysis.update({
      where: { id: analysisId },
      data: {
        webPageTestStatus: "completed",
        webPageTestTestId: summary.testId,
        webPageTestAnalyzedAt: new Date(summary.analyzedAt)
      }
    });
  }

  async getWebPageTestByAnalysis(
    analysisId: string
  ): Promise<import("../../types/webpagetest.js").WebPageTestSummary | null> {
    const r = await this.db.webPageTestResult.findUnique({ where: { analysisId } });
    if (!r) {
      return null;
    }
    return {
      testId: String(r.testId),
      status: String(r.status) as import("../../types/webpagetest.js").WptStatus,
      metrics: Array.isArray(r.metrics) ? (r.metrics as import("../../types/analysis.js").Metric[]) : [],
      requests: Number(r.requests),
      bytes: Number(r.bytes),
      topRequests: Array.isArray(r.topRequests)
        ? (r.topRequests as import("../../types/webpagetest.js").WebPageTestRequestEvidence[])
        : [],
      waterfallRef: r.waterfallRef ? String(r.waterfallRef) : undefined,
      analyzedAt: (r.analyzedAt as Date).toISOString()
    };
  }
}