import { useEffect, useMemo, useState } from "react";
import type { AnalysisResult, AnalysisSummary, ComparisonResult, Strategy } from "@/types/analysis";
import { getAnalysisById, getSiteAnalyses, compareAnalyses, generateReport, ApiRequestError } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "./LoadingState";
import { ErrorMessage } from "./ErrorMessage";
import { MetricChart } from "./MetricChart";
import { ComparisonTable } from "./ComparisonTable";
import { AnalysisResultView } from "./AnalysisResultView";

interface SiteDetailPageProps {
  siteId: string;
  onBack: () => void;
}

const METRIC_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "performance-score", label: "Performance" },
  { id: "LCP", label: "LCP" },
  { id: "INP", label: "INP" },
  { id: "CLS", label: "CLS" },
  { id: "FCP", label: "FCP" },
  { id: "TTFB", label: "TTFB" }
];

export function SiteDetailPage({ siteId, onBack }: SiteDetailPageProps) {
  const { t, date } = useI18n();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState("performance-score");
  const [strategyFilter, setStrategyFilter] = useState<Strategy | "">("");
  const [baselineId, setBaselineId] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnalysisResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    try {
      const data = await getSiteAnalyses(siteId, { strategy: strategyFilter as Strategy | undefined });
      setAnalyses(data.analyses);
      setSiteName(data.site.name);
      setSiteUrl(data.site.url);
      if (data.analyses.length > 0) {
        const first = data.analyses[0]!;
        if (!currentId) setCurrentId(first.id);
        if (!baselineId && data.analyses.length > 1) setBaselineId(data.analyses[1]!.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setAnalyses([]);
    void load();
  }, [siteId, strategyFilter]);

  const sortedAsc = useMemo(
    () =>
      [...analyses]
        .sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime()),
    [analyses]
  );

  const chartPoints = useMemo(() => {
    return sortedAsc.map((a) => {
      const dt = new Date(a.analyzedAt);
      const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(dt);
      let value: number | null = null;
      if (chartMetric === "performance-score") {
        value = a.score;
      } else {
        // summaries do not have metrics; we must fetch full details for historical values.
        // Simplification: if the analysis is selected as current or baseline, it may be loaded.
        // For compactness, we just show empty chart when metric not score unless we fetch each detail.
        value = null;
      }
      return { label, value, id: a.id };
    });
  }, [sortedAsc, chartMetric]);

  const handleCompare = async () => {
    if (!baselineId || !currentId) {
      setCompareError("Selecione as duas análises.");
      return;
    }
    setCompareLoading(true);
    setCompareError(null);
    try {
      const result = await compareAnalyses(currentId, baselineId);
      setComparison(result);
    } catch (err) {
      setCompareError(err instanceof ApiRequestError ? err.message : "Falha ao comparar análises.");
    } finally {
      setCompareLoading(false);
    }
  };

  const handleReport = async (analysisId: string) => {
    try {
      const html = await generateReport(analysisId);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao gerar relatório.");
    }
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const full = await getAnalysisById(id);
      setDetail(full);
      // pre-populate metric chart from detail only if first load
      if (!chartMetric) {
        setChartMetric("performance-score");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao carregar detalhes.");
    } finally {
      setDetailLoading(false);
    }
  };

  if (detailId && detail) {
    return (
      <div className="site-detail">
        <div className="page__header">
          <button className="back-button" onClick={() => { setDetailId(null); setDetail(null); }}>{t("back")}</button>
          <h2>Detalhe da análise</h2>
        </div>
        <AnalysisResultView result={detail} />
      </div>
    );
  }

  if (detailLoading) {
    return <LoadingState />;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="site-detail">
      <div className="page__header">
        <button className="back-button" onClick={onBack}>{t("back")}</button>
        <h2>{siteName}</h2>
        <p className="site-detail__url">{siteUrl}</p>
      </div>

      {error ? (
        <ErrorMessage message={error} onRetry={() => { setLoading(true); setError(null); void load(); }} />
      ) : (
        <>
          <section className="controls">
            <label>
              {t("history.table.strategy")}
              <select value={strategyFilter} onChange={(e) => { setStrategyFilter(e.target.value as Strategy | ""); setLoading(true); setAnalyses([]); }}>
                <option value="">{t("history.strategy.all")}</option>
                <option value="mobile">{t("form.strategy.mobile")}</option>
                <option value="desktop">{t("form.strategy.desktop")}</option>
              </select>
            </label>
            <label>
              Métrica (gráfico)
              <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value)}>
                {METRIC_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>
          </section>

          <MetricChart
            title={METRIC_OPTIONS.find((o) => o.id === chartMetric)?.label ?? chartMetric}
            points={chartPoints.map((p) => ({ label: p.label, value: p.value }))}
            color={chartMetric === "performance-score" ? "#5b8cff" : chartMetric === "CLS" ? "#f0b429" : "#2bd576"}
          />

          {analyses.length === 0 ? (
            <p>{t("history.empty")}</p>
          ) : (
            <section className="history-list">
              <h2>{t("history.title")}</h2>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{t("history.table.date")}</th>
                    <th>{t("history.table.score")}</th>
                    <th>{t("history.table.strategy")}</th>
                    <th>{t("history.table.audits")}</th>
                    <th>{t("history.table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((a) => (
                    <tr key={a.id}>
                      <td>{date(a.analyzedAt)}</td>
                      <td>{a.score ?? "—"}</td>
                      <td className="analysis-meta__strategy">{a.strategy}</td>
                      <td>{a.failedAuditsCount} ({a.highImpactCount} alto)</td>
                      <td className="history-actions">
                        <button onClick={() => void openDetail(a.id)}>{t("history.actions.details")}</button>
                        <button onClick={() => void handleReport(a.id)}>{t("history.actions.report")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="compare-section">
            <h3>{t("compare.title")}</h3>
            <div className="compare-controls">
              <label>
                {t("compare.baseline")}
                <select value={baselineId} onChange={(e) => setBaselineId(e.target.value)}>
                  <option value="">—</option>
                  {analyses.map((a) => (
                    <option key={a.id} value={a.id}>{`${new Date(a.analyzedAt).toLocaleDateString()} — ${a.score ?? "?"} (${a.strategy})`}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("compare.current")}
                <select value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
                  <option value="">—</option>
                  {analyses.map((a) => (
                    <option key={a.id} value={a.id}>{`${new Date(a.analyzedAt).toLocaleDateString()} — ${a.score ?? "?"} (${a.strategy})`}</option>
                  ))}
                </select>
              </label>
              <button className="analysis-form__submit" disabled={compareLoading} onClick={() => void handleCompare()}>
                {compareLoading ? "..." : t("compare.run")}
              </button>
            </div>
            {compareError && <ErrorMessage message={compareError} />}
            {comparison ? <ComparisonTable comparison={comparison} /> : <p>{t("compare.empty")}</p>}
          </section>
        </>
      )}
    </div>
  );
}