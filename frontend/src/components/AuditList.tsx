import type { Audit } from "@/types/analysis";
import { AuditItem } from "./AuditItem";
import { useI18n } from "@/i18n";

export interface AuditListProps {
  audits: Audit[];
}

export function AuditList({ audits }: AuditListProps) {
  const { t } = useI18n();

  if (audits.length === 0) {
    return (
      <section className="audit-list audit-list--empty">
        <h2 className="audit-list__title">{t("audits.title")}</h2>
        <p className="audit-list__empty">{t("result.empty")}</p>
      </section>
    );
  }

  return (
    <section className="audit-list" aria-labelledby="audits-heading">
      <div className="audit-list__header">
        <h2 id="audits-heading" className="audit-list__title">
          {t("audits.title")}
        </h2>
        <p className="audit-list__subtitle">{t("audits.subtitle")}</p>
      </div>
      <ol className="audit-list__items">
        {audits.map((audit, index) => (
          <AuditItem key={audit.auditId} audit={audit} rank={index + 1} />
        ))}
      </ol>
    </section>
  );
}