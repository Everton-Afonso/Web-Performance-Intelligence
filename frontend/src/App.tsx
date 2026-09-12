import { lazy } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/layout/AppShell";
import AnalysisPage from "@/pages/AnalysisPage";
import { SitesPage } from "@/components/SitesPage";
import { SiteDetailPage } from "@/components/SiteDetailPage";
import { ProjectsPage } from "@/components/ProjectsPage";
import { MonitoringPage } from "@/components/MonitoringPage";
import { AlertsPage } from "@/components/AlertsPage";
import { GoalsPage } from "@/pages/GoalsPage";
import SettingsPage from "@/pages/SettingsPage";

// Heavy chart pages are lazy-loaded to keep the initial bundle lean (design doc §33).
const OverviewPage = lazy(() => import("@/pages/OverviewPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const ComparisonsPage = lazy(() => import("@/pages/ComparisonsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));

function noop() {
  return undefined;
}

function SitesRoute() {
  const navigate = useNavigate();
  return (
    <SitesPage
      onBack={noop}
      onSelectSite={(id) => navigate(`/sites/${id}`)}
    />
  );
}

function SiteDetailRoute() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  if (!siteId) return <Navigate to="/sites" replace />;
  return <SiteDetailPage siteId={siteId} onBack={() => navigate(-1)} />;
}

function ProjectsRoute() {
  const navigate = useNavigate();
  return <ProjectsPage onBack={() => navigate(-1)} />;
}

function MonitoringRoute() {
  const navigate = useNavigate();
  return <MonitoringPage onBack={() => navigate(-1)} />;
}

function AlertsRoute() {
  return <AlertsPage onBack={noop} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/analyze" element={<AnalysisPage />} />
        <Route path="/sites" element={<SitesRoute />} />
        <Route path="/sites/:siteId" element={<SiteDetailRoute />} />
        <Route path="/projects" element={<ProjectsRoute />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/comparisons" element={<ComparisonsPage />} />
        <Route path="/monitoring" element={<MonitoringRoute />} />
        <Route path="/alerts" element={<AlertsRoute />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  );
}