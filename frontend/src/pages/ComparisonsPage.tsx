import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { AnalysisSummary, ComparisonResult, SiteRecord } from "@/types/analysis";
import { listSites, getSiteAnalyses, compareAnalyses } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState, SectionHeader } from "@/components/ui";
import { ComparisonTable } from "@/components/ComparisonTable";
import { GroupedBars } from "@/components/charts";

export default function ComparisonsPage() {
  const { t, date } = useI18n();
  const [params, setParams] = useSearchParams();
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [perSite, setPerSite] = useState<Record<string, AnalysisSummary[]>>({});
  const [currentId, setCurrentId] = useState(params.get("current") ?? "");
  const [baselineId, setBaselineId] = useState(params.get("baseline") ?? "");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const s = await listSites();
      setSites(s);
      const map: Record<string, AnalysisSummary[]> = {};
      for (const site of s) {
        const { analyses } = await getSiteAnalyses(site.id, { limit: 30 });
        map[site.id] = analyses;
      }
      setPerSite(map);
      setLoading(false);
    })();
  }, []);

  const allRows = useMemo(() => Object.values(perSite).flat().sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()), [perSite]);

  const options = useMemo(
    () => [{ id: "", label: "—" }, ...allRows.map((r) => ({ id: r.id, label: `${r.site?.name ?? ""} · ${date(r.analyzedAt)} · ${r.strategy} (${r.score ?? "?"})` }))],
    [allRows, date]
  );

  useEffect(() => {
    if (!currentId || !baselineId) return;
    void compareAnalyses(currentId, baselineId).then(setResult).catch(() => setResult(null));
  }, [currentId, baselineId]);

  const bars = useMemo(() => {
    if (!result) return [];
    const small = (key: "before" | "after", value: number | null) =>
      value === null ? 0 : Math.min(120, Math.round(value * 100));
    return result.metrics
      .filter((m) => ["LCP", "INP", "CLS", "FCP", "TTFB"].includes(m.metricId))
      .map((m) => ({ metric: m.metricId, Before: small("before", m.before?.value ?? null), After: small("after", m.after?.value ?? null) }));
  }, [result]);

  const improvements = result?.metrics.filter((m) => m.direction === "improved") ?? [];
  const regressions = result?.metrics.filter((m) => m.direction === "regressed") ?? [];

  if (loading) return <LoadingState />;

  return (
    <div className="page-inner">
      <SectionHeader title={t("nav.comparisons")} subtitle="Baseline vs Current" />

      <div className="ov-controls">
        <label className="ov-field">
          <span>{t("compare.current")}</span>
          <select value={currentId} onChange={(e) => { setCurrentId(e.target.value); setParams({ ...Object.fromEntries(params), current: e.target.value }); }}>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="ov-field">
          <span>{t("compare.baseline")}</span>
          <select value={baselineId} onChange={(e) => { setBaselineId(e.target.value); setParams({ ...Object.fromEntries(params), baseline: e.target.value }); }}>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {!currentId || !baselineId ? (
        <EmptyState title={t("compare.empty")} hint="Select a baseline and the current analysis to compare." />
      ) : !result ? (
        <EmptyState title="Falha" hint="Não foi possível comparar as análises selecionadas." />
      ) : (
        <>
          <div className="ov-two">
            <div>
              <div className="scorecard-stat">
                <div><span className="muted">{t("compare.before")}</span><h3>{result.scoreBefore ?? "—"}</h3></div>
                <div><span className="muted">{t("compare.after")}</span><h3>{result.scoreAfter ?? "—"}</h3></div>
                <div><span className="muted">{t("compare.direction")}</span><h3 className={result.scoreDirection === "improved" ? "status-good" : result.scoreDirection === "regressed" ? "status-poor" : ""}>{result.scoreDirection}</h3></div>
              </div>
              <ComparisonTable comparison={result} />
            </div>
            <div>
              <SectionHeader title="Before vs After" />
              <GroupedBars data={bars} keys={["Before", "After"]} colors={["#3c465a", "#5b8cff"]} />
            </div>
          </div>

          <div className="ov-two">
            <section>
              <SectionHeader title="Improvements" />
              {improvements.length === 0 ? <p className="muted">—</p> : (
                <ul className="priority-list">
                  {improvements.map((m) => (
                    <li key={m.metricId} className="priority priority--p2">
                      <span className="priority__badge">↓</span>
                      <div className="priority__body">
                        <strong>{m.name}</strong>
                        <p>{m.before?.displayValue} → {m.after?.displayValue} ({m.pctChange !== null ? `${(m.pctChange * -1).toFixed(0)}%` : "—"})</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <SectionHeader title="Regressions" />
              {regressions.length === 0 ? <p className="muted">Nenhuma regressão detectada.</p> : (
                <ul className="priority-list">
                  {regressions.map((m) => (
                    <li key={m.metricId} className="priority priority--p0">
                      <span className="priority__badge">↑</span>
                      <div className="priority__body">
                        <strong>{m.name}</strong>
                        <p>{m.before?.displayValue} → {m.after?.displayValue}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}