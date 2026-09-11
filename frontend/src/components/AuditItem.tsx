import type { Audit } from "@/types/analysis";
import { useI18n } from "@/i18n";

export interface AuditItemProps {
  audit: Audit;
  rank?: number;
}

const SEVERITY_KEY: Record<Audit["severity"], string> = {
  P0: "audit.severity.p0",
  P1: "audit.severity.p1",
  P2: "audit.severity.p2"
};

const IMPACT_KEY: Record<Audit["impact"], string> = {
  high: "impact.high",
  medium: "impact.medium",
  low: "impact.low"
};

export function AuditItem({ audit, rank }: AuditItemProps) {
  const { t } = useI18n();

  return (
    <li className={`audit-item audit-item--${audit.severity.toLowerCase()}`}>
      {rank !== undefined && (
        <span className="audit-item__rank" aria-hidden="true">
          {rank}
        </span>
      )}

      <div className="audit-item__content">
        <header className="audit-item__header">
          <h3 className="audit-item__title">{audit.title}</h3>
          <span className="audit-item__severity">
            {audit.severity} · {t(SEVERITY_KEY[audit.severity])}
          </span>
        </header>

        {audit.description && <p className="audit-item__description">{audit.description}</p>}

        <footer className="audit-item__footer">
          <span className="audit-item__meta">
            {audit.displayValue ? `Valor: ${audit.displayValue}` : ""}
          </span>
          <span className={`audit-item__impact audit-item__impact--${audit.impact}`}>
            {t(IMPACT_KEY[audit.impact])}
          </span>
        </footer>
      </div>
    </li>
  );
}