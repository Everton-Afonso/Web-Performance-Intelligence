import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnalysisSummary, SiteRecord, Strategy } from "@/types/analysis";
import { listSites, getSiteAnalyses, generateReport } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState, SectionHeader, StatusPill } from "@/components/ui";
import { Icons } from "@/layout/icons";

interface Row extends AnalysisSummary {
  siteName: string;
}

export default function HistoryPage() {
  const { t, date } = useI18n();
  const navigate = useNavigate();
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState("");
  const [strategy, setStrategy] = useState<Strategy | "">("");
  const [statusFilter, setStatusFilter] = useState<"good" | "needs-improvement" | "poor" | "">("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const s = await listSites();
        setSites(s);
        const collected: Row[] = [];
        for (const site of s) {
          const { analyses } = await getSiteAnalyses(site.id, { limit: 25 });
          collected.push(...analyses.map((a) => ({ ...a, siteName: site.name })));
        }
        collected.sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
        setRows(collected);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!siteId || r.site.id === siteId) &&
          (!strategy || r.strategy === strategy) &&
          (!statusFilter ||
            (statusFilter === "good" && (r.score ?? 0) >= 90) ||
            (statusFilter === "needs-improvement" && (r.score ?? 0) < 90 && (r.score ?? 0) >= 50) ||
            (statusFilter === "poor" && (r.score ?? 0) < 50))
      ),
    [rows, siteId, strategy, statusFilter]
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [id]));

  const compare = () => {
    if (selected.length === 2) navigate(`/comparisons?baseline=${selected[0]}&current=${selected[1]}`);
  };

  const report = async (id: string) => {
    try {
      const html = await generateReport(id);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert("Falha ao gerar relatório.");
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-inner">
      <SectionHeader
        title={t("history.title")}
        action={
          <button className="btn btn--primary" disabled={selected.length !== 2} onClick={compare}>
            {Icons.compare} {t("history.compareSelected")}
          </button>
        }
      />

      <div className="ov-controls">
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">{t("history.allSites")}</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy | "")}>
          <option value="">{t("history.strategy.all")}</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="">{t("history.filterStatus")}</option>
          <option value="good">Good</option>
          <option value="needs-improvement">Needs Improvement</option>
          <option value="poor">Poor</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("history.empty")} hint={t("ov.emptyHint")} />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th />
              <th>{t("history.table.date")}</th>
              <th>{t("history.site")}</th>
              <th>{t("history.table.device")}</th>
              <th>{t("history.table.score")}</th>
              <th>{t("history.table.issues")}</th>
              <th>{t("history.table.status")}</th>
              <th>{t("history.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tone = (r.score ?? 0) >= 90 ? "good" : (r.score ?? 0) >= 50 ? "warn" : "poor";
              return (
                <tr key={r.id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label="selecionar" />
                  </td>
                  <td>{date(r.analyzedAt)}</td>
                  <td>{r.siteName}</td>
                  <td>{r.strategy}</td>
                  <td><b>{r.score ?? "—"}</b></td>
                  <td>{r.failedAuditsCount}</td>
                  <td><StatusPill tone={tone as "good" | "warn" | "poor"}>{t(`status.${tone === "warn" ? "needs-improvement" : tone}`)}</StatusPill></td>
                  <td className="history-actions">
                    <button onClick={() => navigate(`/sites/${r.site.id}`)}>{t("history.actions.details")}</button>
                    <button onClick={() => void report(r.id)}>{t("history.actions.report")}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}