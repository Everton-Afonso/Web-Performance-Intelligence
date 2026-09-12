import { Suspense, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";
import { unreadAlertsCount } from "@/services/api";
import { LoadingState } from "@/components/LoadingState";
import { Icons } from "./icons";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: boolean;
}

export function AppShell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  useState;
  if (location.pathname.startsWith("/alerts")) {
    void unreadAlertsCount().then((r) => setUnread(r.unread)).catch(() => undefined);
  }

  const items: NavItem[] = [
    { to: "/overview", label: t("nav.overview"), icon: Icons.overview },
    { to: "/analyze", label: t("nav.analyze"), icon: Icons.analyze },
    { to: "/sites", label: t("nav.sites"), icon: Icons.sites },
    { to: "/projects", label: t("nav.projects"), icon: Icons.projects },
    { to: "/history", label: t("nav.history"), icon: Icons.history },
    { to: "/comparisons", label: t("nav.comparisons"), icon: Icons.comparisons },
    { to: "/monitoring", label: t("nav.monitoring"), icon: Icons.monitoring },
    { to: "/alerts", label: t("nav.alerts"), icon: Icons.alerts, badge: unread > 0 },
    { to: "/reports", label: t("nav.reports"), icon: Icons.reports },
    { to: "/goals", label: t("nav.goals"), icon: Icons.goals },
    { to: "/settings", label: t("nav.settings"), icon: Icons.settings }
  ];

  const brand = (
    <div className="sidebar__brand">
      <span className="sidebar__logo">PA</span>
      <div>
        <strong>Performance Auditor</strong>
        <span className="sidebar__workspace">Workspace · Default</span>
      </div>
    </div>
  );

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar__top">
          {brand}
          <button className="sidebar__close" onClick={() => setOpen(false)} aria-label="Fechar menu">
            ×
          </button>
        </div>
        <nav className="sidebar__nav" aria-label="Principal">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && <em className="sidebar__badge">{unread}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <span className="sidebar__user">Admin</span>
          <span className="status-pill status-pill--good">online</span>
        </div>
      </aside>

      {open && <div className="sidebar__backdrop" onClick={() => setOpen(false)} />}

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__left">
            <button className="topbar__menu" onClick={() => setOpen(true)} aria-label="Abrir menu">
              {Icons.menu}
            </button>
            <span className="topbar__crumb">Performance Auditor</span>
          </div>
          <div className="topbar__right">
            <span className="topbar__user">
              <span className="topbar__avatar">E</span> Everton
            </span>
          </div>
        </header>

        <main className="shell__content">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}