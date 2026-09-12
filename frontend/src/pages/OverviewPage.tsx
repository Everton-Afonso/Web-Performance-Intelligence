import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnalysisResult, AnalysisSummary, GoalRecord, SiteRecord } from "@/types/analysis";
import { listSites, getSiteAnalyses, getAnalysisById, compareAnalyses, listGoalsBySite } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState, SectionHeader, StatChip, StatusPill, GoalBar } from "@/components/ui";
import { GroupedBars, HorizontalBars, ScoreGauge, Sparkline, statusColor, StatusSummaryBar, TrendChart, ResourceDonut } from "@/components/charts";
import { ComparisonTable } from "@/components/ComparisonTable";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { WebPageTestPanel } from "@/components/WebPageTestPanel";
import { Icons } from "@/layout/icons";

const CWV_IDS = ["LCP", "INP", "CLS", "FCP", "TTFB"];
const CONFIG: Record<string, { unit: string; color: string; goal: number; fn: string }> = {
  "performance-score": { unit: "", color: "#5b8cff", goal: 85, fn: "score" },
  LCP: { unit: " s", color: "#5b8cff", goal: 2500, fn: "lower" },
  INP: { unit: " ms", color: "#5b8cff", goal: 200, fn: "lower" },
  CLS: { unit: "", color: "#5b8cff", goal: 0.1, fn: "lower" },
  FCP: { unit: " s", color: "#5b8cff", goal: 1800, fn: "lower" },
  TTFB: { unit: " s", color: "#5b8cff", goal: 800, fn: "lower" }
};

function fmt(v: number | null, metric: string): string {
  if (v === null) return "—";
  const cfg = CONFIG[metric]!;
  if (metric === "CLS") return v.toFixed(2);
  if (metric === "performance-score") return Math.round(v).toString();
  if (cfg.unit === " s") return `${(v / 1000).toFixed(1)} s`;
  return `${Math.round(v)} ms`;
}

function pctDiff(before: number, after: number, metric: string): { pct: number; dir: "up" | "down" | "same" } {
  if (before === 0) return { pct: 0, dir: "same" };
  const pct = ((after - before) / before) * 100;
  if (pct === 0) return { pct: 0, dir: "same" };
  const improved = (CONFIG[metric]?.fn ?? "lower") === "score" ? after > before : after < before;
  return { pct: Math.abs(pct), dir: improved ? "down" : pct > 0 ? "up" : "down" };
}

interface TrendItem {
  label: string;
  [key: string]: unknown;
}

export default function OverviewPage() {
  const { t, date } = useI18n();
  const navigate = useNavigate();
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [summaries, setSummaries] = useState<AnalysisSummary[]>([]);
  const [latest, setLatest] = useState<AnalysisResult | null>(null);
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [comparison, setComparison] = useState<Awaited<ReturnType<typeof compareAnalyses>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendMetric, setTrendMetric] = useState("performance-score");
  const [range, setRange] = useState(30);

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { analyses } = await getSiteAnalyses(id, { includeMetrics: true, limit: 40 });
      setSummaries(analyses);
      if (analyses.length === 0) {
        setLatest(null);
        setComparison(null);
        return;
      }
      const latestRec = await getAnalysisById(analyses[0]!.id);
      setLatest(latestRec);
      setGoals(await listGoalsBySite(id));

      const same = analyses[1] && analyses[1]!.strategy === analyses[0]!.strategy ? analyses[1] : undefined;
      if (same) {
        const cmp = await compareAnalyses(analyses[0]!.id, same.id).catch(() => null);
        setComparison(cmp);
      } else {
        setComparison(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void listSites().then((s) => {
      setSites(s);
      if (s.length > 0) setSiteId(s[0]!.id);
    });
  }, []);

  useEffect(() => {
    if (siteId) void load(siteId);
  }, [siteId]);

  const asc = useMemo(
    () => [...summaries].sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime()),
    [summaries]
  );

  const series = useMemo<TrendItem[]>(() => {
    const slice = asc.slice(-range);
    return slice.map((s) => {
      const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(s.analyzedAt));
      const val =
        trendMetric === "performance-score"
          ? s.score
          : s.metricValues?.[trendMetric] ?? null;
      return { label, [trendMetric]: val };
    });
  }, [asc, range, trendMetric]);

  const trendStats = useMemo(() => {
    const vals = series.map((p) => p[trendMetric] as number | null).filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    const goal = goals.find((g) => g.metric === trendMetric);
    return {
      current: vals[vals.length - 1]!,
      previous: vals.length > 1 ? vals[vals.length - 2]! : null,
      best: Math.min(...vals),
      worst: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      goal: goal?.target ?? (trendMetric === "performance-score" ? CONFIG[trendMetric]!.goal : null)
    };
  }, [series, trendMetric, goals]);

  const mobileDesktop = useMemo(() => {
    const byStrategy = new Map<string, AnalysisSummary>();
    for (const s of summaries) if (!byStrategy.has(s.strategy)) byStrategy.set(s.strategy, s);
    const mobile = byStrategy.get("mobile");
    const desktop = byStrategy.get("desktop");
    if (!mobile || !desktop) return null;
    const rows = ["performance-score", "LCP", "INP", "CLS", "FCP", "TTFB"].map((id) => ({
      metric: id,
      Mobile: fmt(id === "performance-score" ? mobile.score : mobile.metricValues?.[id] ?? null, id),
      Desktop: fmt(id === "performance-score" ? desktop.score : desktop.metricValues?.[id] ?? null, id)
    }));
    // Bargraph on CWV uses distance-to-goal (% of target) so scales are comparable.
    const bars = ["LCP", "INP", "CLS", "FCP", "TTFB"]
      .map((id) => {
        const goal = CONFIG[id]!.goal;
        const mv = mobile.metricValues?.[id];
        const dv = desktop.metricValues?.[id];
        const norm = (v: number | null | undefined) => (v === null || v === undefined ? 0 : Math.min(120, Math.round((v / goal) * 100)));
        return { metric: id, Mobile: norm(mv), Desktop: norm(dv) };
      })
      .filter((b) => b.Mobile > 0 || b.Desktop > 0);
    return { mobile, desktop, rows, bars };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaries]);

  const prioritized = useMemo(() => {
    if (!latest?.recommendations) return [];
    const order = { P0: 0, P1: 1, P2: 2 };
    return [...latest.recommendations].sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 6);
  }, [latest]);

  const statusCounts = useMemo(() => {
    const counts = { good: 0, needs: 0, poor: 0 };
    CWV_IDS.forEach((id) => {
      const m = latest?.metrics.find((x) => x.id === id);
      if (m?.status === "good") counts.good += 1;
      else if (m?.status === "needs-improvement") counts.needs += 1;
      else if (m?.status === "poor") counts.poor += 1;
    });
    return counts;
  }, [latest]);

  const wptBuckets = useMemo(() => {
    if (!latest?.webPageTest || latest.webPageTest.status !== "completed") return null;
    const byType: Record<string, number> = {};
    const thirdParty: Array<{ name: string; value: number }> = [];
    const thirdMap = new Map<string, number>();
    for (const r of latest.webPageTest.topRequests) {
      const type = (r.contentType || "other").toLowerCase();
      const key = type.includes("javascript") ? "JS" : type.includes("css") ? "CSS" : type.startsWith("image") ? "Images" : type.includes("font") ? "Fonts" : "Other";
      byType[key] = (byType[key] ?? 0) + r.bytes;
      if (r.isThirdParty) thirdMap.set(r.host, (thirdMap.get(r.host) ?? 0) + r.loadTime);
    }
    const data = Object.entries(byType).map(([name, value]) => ({ name, value }));
    const thirds = [...thirdMap.entries()].map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 6);
    return { data, thirds };
  }, [latest]);

  const priorIdx = summaries.findIndex((s, i) => i > 0 && s.strategy === summaries[0]?.strategy);
  void priorIdx;

  if (loading) return <LoadingState />;

  if (!latest) {
    return (
      <div className="page-inner">
        <EmptyState
          title={t("ov.empty")}
          hint={t("ov.emptyHint")}
          action={
            <button className="btn btn--primary" onClick={() => navigate("/analyze")}>{t("nav.analyze")}</button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-inner overview">
      {error && <p className="analysis-form__error">{error}</p>}

      {/* Header */}
      <section className="ov-head">
        <div className="ov-head__info">
          <div className="ov-head__select">
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <h1 className="ov-head__title">{latest.site?.name ?? latest.requestedUrl}</h1>
          <p className="ov-head__url">{latest.requestedUrl}</p>
          <p className="ov-head__meta">
            {t("ov.lastAnalysis")}: {date(latest.analyzedAt)} · {latest.strategy} ·{" "}
            <StatusPill tone={latest.performanceScore! >= 50 ? (latest.performanceScore! >= 90 ? "good" : "warn") : "poor"}>
              {t("status." + (latest.performanceScore! >= 90 ? "good" : latest.performanceScore! >= 50 ? "needs-improvement" : "poor"))}
            </StatusPill>
          </p>
        </div>
        <div className="ov-head__actions">
          <button className="btn btn--primary" onClick={() => navigate("/analyze")}>{Icons.run} {t("ov.runAnalysis")}</button>
          <button className="btn" onClick={() => navigate("/comparisons")}>{Icons.compare} {t("ov.compare")}</button>
          <button className="btn" onClick={() => navigate("/reports")}>{Icons.report} {t("ov.generateReport")}</button>
        </div>
      </section>

      {/* Score + highlights */}
      <section className="ov-scorecard">
        <div className="scorecard-gauge">
          <ScoreGauge value={latest.performanceScore} />
          <div>
            <h3>Performance Score</h3>
            {trendStats && trendStats.previous !== null && (
              <span className={trendStats.current > trendStats.previous ? "status-good" : "status-poor"}>
                {(trendStats.current >= trendStats.previous ? "↑" : "↓")} {Math.abs(Math.round(((trendStats.current - trendStats.previous) / (trendStats.previous || 1)) * 100))}%
              </span>
            )}
          </div>
        </div>
        <div className="scorecard-stat">
          <StatChip label={t("ov.previous")} value={summaries[1]?.score ?? "—"} />
          <StatChip label={t("ov.current")} value={latest.performanceScore ?? "—"} />
          <StatChip label={t("ov.goal")} value={goals.find((g) => g.metric === "performance-score")?.target ?? "—"} tint="accent" />
          {trendStats && (
            <span className="scorecard-delta">
              {Math.round((latest.performanceScore ?? 0) - (summaries[1]?.score ?? 0)) > 0 ? "+" : ""}
              {Math.round((latest.performanceScore ?? 0) - (summaries[1]?.score ?? 0))} pts
            </span>
          )}
        </div>
      </section>

      {/* CWV cards */}
      <section>
        <SectionHeader title={t("ov.coreWebVitals")} subtitle={`${statusCounts.good}/${CWV_IDS.length} ${t("ov.passing")}`} />
        <div className="ov-cwv">
          {latest.metrics
            .filter((m) => CWV_IDS.includes(m.id))
            .map((m) => {
              const seriesFor = asc.map((s) => s.metricValues?.[m.id] ?? null).filter((v): v is number => v !== null);
              const prevV = summaries[1]?.metricValues?.[m.id] ?? null;
              const diff = m.value !== null && prevV !== null ? pctDiff(prevV, m.value, m.id) : null;
              return (
                <article key={m.id} className="cwv-card">
                  <header className="cwv-card__head">
                    <span className="cwv-card__id">{m.id}</span>
                    <StatusPill tone={m.status === "good" ? "good" : m.status === "poor" ? "poor" : m.status === "needs-improvement" ? "warn" : "neutral"}>
                      {t("status." + (m.status ?? "unavailable")).toUpperCase()}
                    </StatusPill>
                  </header>
                  <strong className="cwv-card__value" style={{ color: statusColor(m.status) }}>{m.displayValue}</strong>
                  <Sparkline points={seriesFor} color={statusColor(m.status)} />
                  <footer className="cwv-card__foot">
                    <span>{t("ov.goal")}: ≤ {fmt(CONFIG[m.id]!.goal, m.id)}</span>
                    {diff && (
                      <span className={diff.dir === "up" ? "status-poor" : "status-good"}>
                        {diff.dir === "same" ? "—" : `${diff.dir === "up" ? "↑" : "↓"} ${diff.pct.toFixed(0)}%`}
                      </span>
                    )}
                  </footer>
                </article>
              );
            })}
        </div>
        <StatusSummaryBar counts={statusCounts} />
      </section>

      {/* Performance over time */}
      <section className="ov-section">
        <SectionHeader
          title="Performance over time"
          subtitle={trendStats ? `${t("ov.current")}: ${fmt(trendStats.current, trendMetric)}` : undefined}
          action={
            <div className="ov-controls">
              <select value={trendMetric} onChange={(e) => setTrendMetric(e.target.value)}>
                {Object.keys(CONFIG).map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
              <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
                {[7, 30, 90, 180, 365].map((r) => <option key={r} value={r}>{`${r} days`}</option>)}
              </select>
            </div>
          }
        />
        {trendStats && (
          <div className="ov-stats">
            <StatChip label={t("ov.previous")} value={trendStats.previous !== null ? fmt(trendStats.previous, trendMetric) : "—"} />
            <StatChip label={t("ov.current")} value={fmt(trendStats.current, trendMetric)} tint="accent" />
            <StatChip label={t("ov.best")} value={fmt(trendStats.best, trendMetric)} />
            <StatChip label={t("ov.worst")} value={fmt(trendStats.worst, trendMetric)} tint="poor" />
            <StatChip label={t("ov.avg")} value={fmt(trendStats.avg, trendMetric)} />
            <StatChip label={t("ov.goal")} value={trendStats.goal !== null ? fmt(trendStats.goal, trendMetric) : "—"} tint="accent" />
          </div>
        )}
        <TrendChart data={series} dataKey={trendMetric} goal={trendStats?.goal ?? null} color={CONFIG[trendMetric]!.color} />
      </section>

      {/* Mobile vs Desktop */}
      {mobileDesktop && (
        <section className="ov-section">
          <SectionHeader title="Mobile vs Desktop" />
          <div className="ov-two">
            <table className="history-table ov-md-table">
              <thead>
                <tr><th>Metric</th><th>Mobile</th><th>Desktop</th></tr>
              </thead>
              <tbody>
                {mobileDesktop.rows.map((r) => (
                  <tr key={r.metric}>
                    <td>{r.metric}</td>
                    <td>{r.Mobile}</td>
                    <td>{r.Desktop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <GroupedBars data={mobileDesktop.bars} keys={["Mobile", "Desktop"]} />
          </div>
        </section>
      )}

      {/* Before vs After */}
      {comparison && (
        <section className="ov-section">
          <SectionHeader title="Before vs After" subtitle="Optimization impact" />
          <ComparisonTable comparison={comparison} />
        </section>
      )}

      {/* Priority issues */}
      <section className="ov-section">
        <SectionHeader title={t("ov.priorityIssues")} />
        {prioritized.length === 0 ? (
          <p className="muted">{t("audits.empty")}</p>
        ) : (
          <ul className="priority-list">
            {prioritized.map((r) => (
              <li key={r.targetId + r.title} className={`priority priority--${r.priority.toLowerCase()}`}>
                <span className="priority__badge">{r.priority}</span>
                <div className="priority__body">
                  <strong>{r.title}</strong>
                  <p>{r.description}</p>
                  <p className="muted">{r.cause}</p>
                </div>
                <span className="status-pill status-pill--accent">{t("rec.impact")}: {r.expectedImpact}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lab vs Field */}
      {latest.fieldData && (
        <section className="ov-section">
          <SectionHeader title="Lab vs Real Users" subtitle="Laboratory (Lighthouse) × Field (CrUX)" />
          <table className="history-table ov-md-table">
            <thead><tr><th>Metric</th><th>Lab</th><th>Field</th></tr></thead>
            <tbody>
              {CWV_IDS.filter((id) => id !== "INP").map((id) => {
                const lab = latest!.metrics.find((m) => m.id === id);
                const field = latest!.fieldData!.metrics.find((m) => m.id === id);
                return (
                  <tr key={id}>
                    <td>{id}</td>
                    <td>{lab?.displayValue ?? "—"}</td>
                    <td>{field?.displayValue ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* WebPageTest */}
      <section className="ov-section">
        <WebPageTestPanel summary={latest.webPageTest ?? null} suggested={Boolean(latest.needsWebPageTest)} analysisId={latest.id} />
      </section>

      {/* Resource distribution + third-party */}
      {wptBuckets && (
        <section className="ov-section ov-grid-2">
          <div>
            <SectionHeader title={t("ov.pageWeight")} />
            <ResourceDonut data={wptBuckets.data} />
          </div>
          <div>
            <SectionHeader title={t("ov.thirdParty")} subtitle="load time (top hosts)" />
            <HorizontalBars data={wptBuckets.thirds} color="var(--poor)" />
          </div>
        </section>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <section className="ov-section">
          <SectionHeader title={t("goals.title")} />
          <div className="ov-goals">
            {goals.map((g) => {
              const v = latest.metrics.find((m) => m.id === g.metric)?.value ?? null;
              const met = v !== null && (g.operator === "lte" ? v <= g.target : v >= g.target);
              return <GoalBar key={g.id} label={g.metric} value={v ?? 0} target={g.target} achieved={met} />;
            })}
          </div>
        </section>
      )}

      {/* AI insights */}
      <section className="ov-section">
        <RecommendationsPanel recommendations={latest.recommendations ?? []} />
        {latest.recommendations && latest.recommendations.length > 0 && (
          <div className="ov-action">
            <button className="btn btn--primary" onClick={() => navigate("/reports")}>{t("ov.actionPlan")}</button>
          </div>
        )}
      </section>
    </div>
  );
}