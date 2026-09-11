import { useState } from "react";
import type { WebPageTestSummary } from "@/types/analysis";
import { runWebPageTest, getWebPageTest, ApiRequestError } from "@/services/api";
import { useI18n } from "@/i18n";

export interface WebPageTestPanelProps {
  analysisId: string;
  summary: WebPageTestSummary | null | undefined;
  suggested: boolean;
}

export function WebPageTestPanel({ analysisId, summary, suggested }: WebPageTestPanelProps) {
  const { t } = useI18n();
  const [local, setLocal] = useState<WebPageTestSummary | null>(summary ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const { webPageTest } = await runWebPageTest(analysisId);
      setLocal(webPageTest);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Falha ao iniciar WebPageTest.");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    setError(null);
    try {
      const { webPageTest } = await getWebPageTest(analysisId);
      setLocal(webPageTest);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Falha ao consultar WebPageTest.");
    } finally {
      setBusy(false);
    }
  };

  const isCompleted = local?.status === "completed";
  const inProgress = local?.status === "pending" || local?.status === "timeout";

  return (
    <section className="wpt">
      <header className="wpt__header">
        <h2 className="recs__title">{t("wpt.title")}</h2>
        {suggested && <span className="wpt__suggested">{t("wpt.suggested")}</span>}
      </header>

      {!local && (
        <div className="wpt__body">
          <p className="muted">{t("wpt.notRun")}</p>
          <button className="analysis-form__submit" disabled={busy} onClick={() => void start()}>
            {busy ? "..." : t("wpt.run")}
          </button>
        </div>
      )}

      {error && <p className="analysis-form__error">{error}</p>}

      {local && !isCompleted && (
        <div className="wpt__body">
          <p>
            <strong>testId:</strong> {local.testId} · <strong>status:</strong> {local.status}
          </p>
          <p className="muted">{t("wpt.pendingHint")}</p>
          <button className="analysis-form__submit" disabled={busy} onClick={() => void refresh()}>
            {busy ? "..." : t("wpt.poll")}
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="wpt__body">
          <p className="wpt__meta">
            {local.waterfallRef && (
              <a href={local.waterfallRef} target="_blank" rel="noreferrer">
                {t("wpt.waterfall")}
              </a>
            )}
            {local.location ? ` · ${local.location}` : ""}
            {local.browser ? ` · ${local.browser}` : ""}
          </p>

          <p className="wpt__counts">
            <strong>{local.requests}</strong> {t("wpt.requestsCount").toLowerCase()} ·{" "}
            <strong>{(local.bytes / 1024).toFixed(1)} kB</strong> {t("wpt.bytesCount").toLowerCase()}
          </p>

          {local.metrics.length > 0 && (
            <div className="metrics__list">
              {local.metrics.map((m) => (
                <article key={m.id} className="metric-card metric-card--wpt">
                  <span className="metric-card__name">{m.name}</span>
                  <p className="metric-card__value">{m.displayValue}</p>
                </article>
              ))}
            </div>
          )}

          {local.topRequests.length > 0 && (
            <>
              <h3 className="wpt__subtitle">{t("wpt.topRequests")}</h3>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{t("wpt.req.resource")}</th>
                    <th>{t("wpt.req.host")}</th>
                    <th>{t("wpt.req.type")}</th>
                    <th>{t("wpt.req.load")}</th>
                    <th>{t("wpt.req.bytes")}</th>
                    <th>3rd</th>
                  </tr>
                </thead>
                <tbody>
                  {local.topRequests.map((r, i) => (
                    <tr key={i}>
                      <td>{r.url.replace(/^https?:\/\//, "").slice(0, 60)}</td>
                      <td>{r.host}</td>
                      <td>{r.contentType}</td>
                      <td>{r.loadTime.toFixed(0)} ms</td>
                      <td>{(r.bytes / 1024).toFixed(1)} kB</td>
                      <td>{r.isThirdParty ? "sim" : "não"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <button className="analysis-form__submit" disabled={busy} onClick={() => void refresh()}>
            {busy ? "..." : t("wpt.poll")}
          </button>
        </div>
      )}
    </section>
  );
}