import { useEffect, useState } from "react";
import type { AlertRecord } from "@/types/analysis";
import { listAlerts, markAlertRead, unreadAlertsCount, ApiRequestError } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "./LoadingState";
import { ErrorMessage } from "./ErrorMessage";

interface Props {
  onBack: () => void;
  onUnreadChange?: (count: number) => void;
}

export function AlertsPage({ onBack, onUnreadChange }: Props) {
  const { t, date } = useI18n();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [a, c] = await Promise.all([
        listAlerts({ unreadOnly: filterUnread }),
        unreadAlertsCount()
      ]);
      setAlerts(a);
      setUnreadCount(c.unread);
      onUnreadChange?.(c.unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar alertas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
  }, [filterUnread]);

  const markRead = async (id: string) => {
    await markAlertRead(id);
    void load();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="alerts-page">
      <div className="page__header">
        <button className="back-button" onClick={onBack}>{t("back")}</button>
        <h2>{t("alerts.title")} ({unreadCount} {t("alerts.unread").toLowerCase()})</h2>
      </div>

      <div className="controls">
        <label>
          <input type="checkbox" checked={filterUnread} onChange={(e) => setFilterUnread(e.target.checked)} />
          {t("alerts.unread")}
        </label>
      </div>

      {error && <ErrorMessage message={error} />}

      {alerts.length === 0 ? (
        <p>{t("alerts.empty")}</p>
      ) : (
        <ul className="audit-list">
          {alerts.map((a) => (
            <li key={a.id} className={`audit-item audit-item--${a.severity === "high" ? "p0" : "p1"}`}>
              <div className="audit-item__content">
                <header className="audit-item__header">
                  <h3 className="audit-item__title">{a.site?.name ?? a.siteId}</h3>
                  <span className="audit-item__severity">
                    {a.severity === "high" ? t("audit.severity.p0") : t("audit.severity.p1")} · {t(`alerts.type.${a.type}`)}
                  </span>
                </header>
                <p className="audit-item__description">{a.message}</p>
                <footer className="audit-item__footer">
                  <span className="audit-item__meta">{a.metric} · {date(a.createdAt)}</span>
                  <span className="history-actions">
                    {!a.read && <button onClick={() => void markRead(a.id)}>{t("alerts.markRead")}</button>}
                  </span>
                </footer>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}