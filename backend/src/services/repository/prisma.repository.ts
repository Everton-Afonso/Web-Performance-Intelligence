import type {
  AnalysisRecord,
  AnalysisSummary,
  ComparisonResult,
  CreateAnalysisInput,
  CreateComparisonInput,
  FieldData,
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
    findMany(): Promise<Array<Record<string, unknown>>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  };
  analysis: {
    create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
    findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    findMany(args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  };
  comparison: {
    create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
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

function normalizeStoredMetric(name: string, value: number | null, unit: string, status: string | null): Metric {
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
      value === null ? "Não disponível" : cfg.display(value, cfg.unit ?? safeUnit)
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
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString()
  };
}

function toAnalysisRecord(row: Record<string, unknown>): AnalysisRecord {
  const site = row.site as Record<string, unknown>;
  const metrics = (row.metrics as unknown[]) ?? [];
  const audits = (row.audits as unknown[]) ?? [];

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
      return normalizeStoredMetric(String(mm.name), (mm.value as number | null) ?? null, String(mm.unit), (mm.status as string | null) ?? null);
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
        impact: aa.impact as Audit["impact"]
      };
      return result;
    })
  };
}

/**
 * Prisma-based repository implementing the V2 persistence contract.
 * Accepts any Prisma client whose model surface matches `AnalysisDb`
 * (production Postgres or the SQLite test client).
 */
export class PrismaRepository implements Repository {
  constructor(private readonly db: AnalysisDb) {}

  async upsertSite(input: { name: string; url: string }): Promise<SiteRecord> {
    const site = await this.db.site.upsert({
      where: { url: input.url },
      update: { name: input.name },
      create: { name: input.name, url: input.url }
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
            name: m.id,
            value: m.value,
            unit: m.unit,
            status: m.status
          }))
        },
        audits: {
          create: input.audits.map((a) => ({
            auditId: a.auditId,
            title: a.title,
            description: a.description,
            score: a.score,
            numericValue: a.numericValue,
            displayValue: a.displayValue ?? null,
            severity: a.severity,
            impact: a.impact
          }))
        }
      },
      include: {
        site: { select: { id: true, name: true, url: true } },
        metrics: { select: { name: true, value: true, unit: true, status: true } },
        audits: { select: { auditId: true, title: true, description: true, score: true, numericValue: true, displayValue: true, severity: true, impact: true } }
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
        metrics: { select: { name: true, value: true, unit: true, status: true } },
        audits: { select: { auditId: true, title: true, description: true, score: true, numericValue: true, displayValue: true, severity: true, impact: true } }
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
}