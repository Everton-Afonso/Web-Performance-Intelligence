import { useEffect, useMemo, useState } from "react";
import type { AnalysisSummary, SiteRecord } from "@/types/analysis";
import { listSites, getSiteAnalyses, generateReport } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState, SectionHeader } from "@/components/ui";
import { Icons } from "@/layout/icons";

type ReportKind = "executive" | "technical" | "comparison";

export default function ReportsPage() {
  const { t, date } = useI18n();
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [perSite, setPerSite] = useState<Record<string, AnalysisSummary[]>>({});
  const [siteId, setSiteId] = useState("");
  const [analysisId, setAnalysisId] = useState("");
  const [baselineId, setBaselineId] = useState("");
  const [includeWpt, setIncludeWpt] = useState(true);
  const [includeCrux, setIncludeCrux] = useState(true);
  const [includeAi, setIncludeAi] = useState(true);
  const [kind, setKind] = useState<ReportKind>("executive");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const s = await listSites();
      setSites(s);
      const map: Record<string, AnalysisSummary[]> = {};
      for (const site of s) {
        const { analyses } = await getSiteAnalyses(site.id, { limit: 20 });
        map[site.id] = analyses;
      }
      setPerSite(map);
      if (s.length > 0) setSiteId(s[0]!.id);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => (siteId ? perSite[siteId] ?? [] : []), [siteId, perSite]);

  useEffect(() => {
    if (rows.length > 0 && !analysisId) setAnalysisId(rows[0]!.id);
    if (rows.length > 1 && !baselineId) setBaselineId(rows[1]!.id);
    setHtml(null);
  }, [rows, analysisId, baselineId]);

  const generate = async () => {
    if (!analysisId) return;
    setGenerating(true);
    setError(null);
    try {
      const useBaseline = kind === "comparison" ? baselineId || undefined : undefined;
      const out = await generateReport(analysisId, useBaseline);
      setHtml(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar relatório.");
    } finally {
      setGenerating(false);
    }
  };

  const openNewTab = () => {
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-inner">
      <SectionHeader
        title={t("nav.reports")}
        subtitle="Generate professional reports"
        action={
          <button className="btn btn--primary" disabled={generating || !analysisId} onClick={() => void generate()}>
            {Icons.report} {generating ? "..." : t("ov.generateReport")}
          </button>
        }
      />

      <div className="feature-grid">
        <section className="panel">
          <h3>Options</h3>
          <label className="ov-field">
            <span>{t("history.site")}</span>
            <select value={siteId} onChange={(e) => { setSiteId(e.target.value); setAnalysisId(""); setBaselineId(""); }}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="ov-field">
            <span>Analysis</span>
            <select value={analysisId} onChange={(e) => setAnalysisId(e.target.value)}>
              {rows.map((r) => <option key={r.id} value={r.id}>{date(r.analyzedAt)} · {r.strategy} · {r.score ?? "?"}</option>)}
            </select>
          </label>
          <label className="ov-field">
            <span>{t("report.type")}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as ReportKind)}>
              <option value="executive">Executive Report</option>
              <option value="technical">Technical Report</option>
              <option value="comparison">Performance Comparison</option>
            </select>
          </label>
          {kind === "comparison" && (
            <label className="ov-field">
              <span>{t("compare.baseline")}</span>
              <select value={baselineId} onChange={(e) => setBaselineId(e.target.value)}>
                {rows.slice(1).map((r) => <option key={r.id} value={r.id}>{date(r.analyzedAt)} · {r.strategy}</option>)}
              </select>
            </label>
          )}
          <div className="ov-check">
            <label><input type="checkbox" checked={includeWpt} onChange={(e) => setIncludeWpt(e.target.checked)} /> Include WebPageTest</label>
            <label><input type="checkbox" checked={includeCrux} onChange={(e) => setIncludeCrux(e.target.checked)} /> Include CrUX</label>
            <label><input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} /> Include AI</label>
          </div>
          <p className="muted small">As opções WebPageTest/CrUX/AI seguem os dados disponíveis na análise selecionada.</p>
        </section>

        <section className="panel">
          <h3>Preview</h3>
          {error && <p className="analysis-form__error">{error}</p>}
          {!html && !generating && <EmptyState title="Nenhum relatório gerado." hint="Configure as opções e clique em Generate report." />}
          {html && (
            <>
              <div className="ov-action">
                <button className="btn btn--primary" onClick={openNewTab}>Abrir em nova aba</button>
              </div>
              <iframe className="report-preview" title="Preview do relatório" srcDoc={html} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}