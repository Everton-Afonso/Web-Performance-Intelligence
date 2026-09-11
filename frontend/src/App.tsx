import { useState } from "react";
import type { Screen } from "@/types/analysis";
import AnalysisPage from "@/pages/AnalysisPage";
import { SitesPage } from "@/components/SitesPage";
import { SiteDetailPage } from "@/components/SiteDetailPage";
import { useI18n } from "@/i18n";

export default function App() {
  const { t } = useI18n();
  const [screen, setScreen] = useState<Screen>("analyze");
  const [payload, setPayload] = useState<Record<string, unknown>>({});

  const navigate = (s: Screen, data: Record<string, unknown> = {}) => {
    setScreen(s);
    setPayload(data);
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
      </main>
    </div>
  );
}