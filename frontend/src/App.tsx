import { useEffect, useState } from "react";
import type { Screen } from "@/types/analysis";
import AnalysisPage from "@/pages/AnalysisPage";
import { SitesPage } from "@/components/SitesPage";
import { SiteDetailPage } from "@/components/SiteDetailPage";
import { ProjectsPage } from "@/components/ProjectsPage";
import { MonitoringPage } from "@/components/MonitoringPage";
import { AlertsPage } from "@/components/AlertsPage";
import { useI18n } from "@/i18n";
import { unreadAlertsCount } from "@/services/api";

export default function App() {
  const { t } = useI18n();
  const [screen, setScreen] = useState<Screen>("analyze");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    void unreadAlertsCount().then((r) => setUnreadAlerts(r.unread)).catch(() => undefined);
  }, []);

  const navigate = (s: Screen, data: Record<string, unknown> = {}) => {
    setScreen(s);
    setPayload(data);
    if (s === "alerts") {
      void unreadAlertsCount().then((r) => setUnreadAlerts(r.unread)).catch(() => undefined);
    }
  };

  return (
    <div className="app">
      <nav className="app-nav">
        <button className={`app-nav__item ${screen === "analyze" ? "active" : ""}`} onClick={() => navigate("analyze")}>
          {t("nav.analyze")}
        </button>
        <button className={`app-nav__item ${screen === "sites" || screen === "siteDetail" ? "active" : ""}`} onClick={() => navigate("sites")}>
          {t("nav.sites")}
        </button>
        <button className={`app-nav__item ${screen === "projects" ? "active" : ""}`} onClick={() => navigate("projects")}>
          {t("projects.title")}
        </button>
        <button className={`app-nav__item ${screen === "monitoring" ? "active" : ""}`} onClick={() => navigate("monitoring")}>
          {t("monitoring.title")}
        </button>
        <button className={`app-nav__item ${screen === "alerts" ? "active" : ""}`} onClick={() => navigate("alerts")}>
          {t("alerts.title")}
          {unreadAlerts > 0 && <span className="app-nav__badge">{unreadAlerts}</span>}
        </button>
      </nav>

      <main className="app-content">
        {screen === "analyze" && <AnalysisPage />}

        {screen === "sites" && (
          <SitesPage
            onBack={() => navigate("analyze")}
            onSelectSite={(id) => navigate("siteDetail", { siteId: id })}
          />
        )}

        {screen === "siteDetail" && (
          <SiteDetailPage
            siteId={payload.siteId as string}
            onBack={() => navigate("sites")}
          />
        )}

        {screen === "projects" && (
          <ProjectsPage onBack={() => navigate("sites")} />
        )}

        {screen === "monitoring" && (
          <MonitoringPage onBack={() => navigate("sites")} />
        )}

        {screen === "alerts" && (
          <AlertsPage
            onBack={() => navigate("sites")}
            onUnreadChange={setUnreadAlerts}
          />
        )}
      </main>
    </div>
  );
}