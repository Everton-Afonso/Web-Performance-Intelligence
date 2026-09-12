import { useEffect, useState } from "react";
import type { MonitorRecord, MonitorRunRecord, SiteRecord, Strategy } from "@/types/analysis";
import { listMonitors, createMonitor, toggleMonitor, runMonitorNow, deleteMonitor, listSites, listMonitorRuns, ApiRequestError } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "./LoadingState";
import { ErrorMessage } from "./ErrorMessage";

interface Props {
  onBack: () => void;
}

interface RunsState {
  loadingId: string | null;
  runs: Record<string, MonitorRunRecord[]>;
}

export function MonitoringPage({ onBack }: Props) {
  const { t, date } = useI18n();
  const [monitors, setMonitors] = useState<MonitorRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [intervalHours, setIntervalHours] = useState(6);
  const [creating, setCreating] = useState(false);
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const [runsState, setRunsState] = useState<RunsState>({ loadingId: null, runs: {} });

  const loadRuns = async (monitorId: string) => {
    setRunsState((s) => ({ ...s, loadingId: monitorId }));
    try {
      const runs = await listMonitorRuns(monitorId);
      setRunsState((s) => ({ loadingId: null, runs: { ...s.runs, [monitorId]: runs } }));
    } catch {
      setRunsState((s) => ({ ...s, loadingId: null }));
    }
  };

  const load = async () => {
    try {
      const [m, s] = await Promise.all([listMonitors(), listSites()]);
      setMonitors(m);
      setSites(s);
      if (s.length > 0 && !siteId) setSiteId(s[0]!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar monitoramento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) return;
    setCreating(true);
    setCreatingError(null);
    try {
      await createMonitor(siteId, strategy, intervalHours);
      setMonitors(await listMonitors());
    } catch (err) {
      setCreatingError(err instanceof ApiRequestError ? err.message : "Falha ao criar monitor.");
    } finally {
      setCreating(false);
    }
  };

  const runNow = async (id: string) => {
    try {
      const result = await runMonitorNow(id);
      alert(result.alertsCreated ? `${result.alertsCreated} alerta(s) criado(s).` : "Análise executada.");
      setMonitors(await listMonitors());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao executar.");
    }
  };

  const toggle = async (id: string) => {
    await toggleMonitor(id);
    setMonitors(await listMonitors());
  };

  const remove = async (id: string) => {
    if (!confirm(t("monitoring.delete") + "?")) return;
    await deleteMonitor(id);
    setMonitors(await listMonitors());
  };

  if (loading) return <LoadingState />;

  return (
    <div className="monitoring-page">
      <div className="page__header">
        <button className="back-button" onClick={onBack}>{t("back")}</button>
        <h2>{t("monitoring.title")}</h2>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => { setError(null); setLoading(true); void load(); }} />}

      <ul className="sites__list">
        {monitors.map((m) => (
          <li key={m.id} className="sites__item monitor">
            <div className="sites__info">
              <strong className="sites__name">{m.site?.name ?? m.siteId}</strong>
              <span className="sites__url">{m.strategy} · a cada {m.intervalHours}h · {m.enabled ? t("monitoring.enabled") : t("monitoring.disabled")}</span>
              <span className="sites__url">
                Último: {m.lastRunAt ? date(m.lastRunAt) : "—"} · Próximo: {m.nextRunAt ? date(m.nextRunAt) : "—"}
              </span>
            </div>
            {runsState.loadingId === m.id && <span className="muted small">…</span>}
            <div className="history-actions">
              <button onClick={() => void runNow(m.id)}>{t("monitoring.run")}</button>
              <button onClick={() => void toggle(m.id)}>{m.enabled ? t("monitoring.toggle") : t("monitoring.resume")}</button>
              <button onClick={() => void remove(m.id)}>{t("monitoring.delete")}</button>
              <button onClick={() => void loadRuns(m.id)}>{t("monitoring.runs")}</button>
            </div>
            {runsState.runs[m.id] && (
              <ul className="monitor-runs">
                {runsState.runs[m.id]!.length === 0 ? (
                  <li className="muted">{t("monitoring.noRuns")}</li>
                ) : (
                  runsState.runs[m.id]!.map((r) => (
                    <li key={r.id}>
                      <span className={`status-pill ${r.status === "ok" ? "status-pill--good" : "status-pill--poor"}`}>
                        {r.status === "ok" ? "✓ ok" : "✕ erro"}
                      </span>
                      <span>{date(r.startedAt)}</span>
                      <span className="muted">
                        {r.status === "ok" ? `${r.alertsCreated} ${t("alerts.title").toLowerCase()}` : r.message}
                      </span>
                      <span className="muted">· {(r.durationMs / 1000).toFixed(1)} s</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {sites.length > 0 && (
        <form className="sites__form" onSubmit={handleCreate}>
          <h3>{t("monitoring.new")}</h3>
          <label className="analysis-form__field">
            <span>{t("monitoring.form.site")}</span>
            <select className="analysis-form__input" value={siteId} onChange={(e) => setSiteId(e.target.value)} disabled={creating}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.url}</option>
              ))}
            </select>
          </label>
          <label className="analysis-form__field">
            <span>{t("monitoring.form.strategy")}</span>
            <select className="analysis-form__input" value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)} disabled={creating}>
              <option value="mobile">{t("form.strategy.mobile")}</option>
              <option value="desktop">{t("form.strategy.desktop")}</option>
            </select>
          </label>
          <label className="analysis-form__field">
            <span>{t("monitoring.form.interval")}</span>
            <input type="number" min={1} className="analysis-form__input" value={intervalHours} onChange={(e) => setIntervalHours(parseInt(e.target.value, 10))} disabled={creating} />
          </label>
          {creatingError && <p className="analysis-form__error">{creatingError}</p>}
          <button type="submit" className="analysis-form__submit" disabled={creating}>{creating ? "..." : t("monitoring.form.submit")}</button>
        </form>
      )}
    </div>
  );
}