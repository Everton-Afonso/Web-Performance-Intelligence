import { useI18n } from "@/i18n";

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-head__title">{title}</h2>
        {subtitle && <p className="section-head__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatChip({ label, value, tint = "" }: { label: string; value: React.ReactNode; tint?: string }) {
  return (
    <div className={`stat-chip ${tint ? `stat-chip--${tint}` : ""}`}>
      <span className="stat-chip__label">{label}</span>
      <span className="stat-chip__value">{value}</span>
    </div>
  );
}

export type PillTone = "good" | "warn" | "poor" | "neutral" | "accent";

export function StatusPill({ tone = "neutral", children }: { tone?: PillTone; children: React.ReactNode }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

export function EmptyState({ icon, title, hint, action }: { icon?: string; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state" role="status">
      {icon && <span className="empty-state__icon">{icon}</span>}
      <strong className="empty-state__title">{title}</strong>
      {hint && <p className="empty-state__hint">{hint}</p>}
      {action}
    </div>
  );
}

export function GoalBar({ label, value, target, achieved }: { label: string; value: number; target: number; achieved: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / target) * 100));
  return (
    <div className="goalbar">
      <div className="goalbar__head">
        <span>{label}</span>
        <span className={achieved ? "status-good" : "status-poor"}>
          {(achieved ? "✓ " : "✕ ") + Math.round(value) + " / " + Math.round(target)}
        </span>
      </div>
      <div className="goalbar__track">
        <div className={`goalbar__fill ${achieved ? "" : "goalbar__fill--miss"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function useI18nForUi() {
  return useI18n();
}