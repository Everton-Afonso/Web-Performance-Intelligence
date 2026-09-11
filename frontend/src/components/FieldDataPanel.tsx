import type { FieldData } from "@/types/analysis";
import { useI18n } from "@/i18n";
import { MetricCard } from "./MetricCard";

export interface FieldDataCardProps {
  fieldData: FieldData | null;
}

export function FieldDataPanel({ fieldData }: FieldDataCardProps) {
  const { t } = useI18n();

  if (!fieldData) {
    return (
      <section className="field-data--empty">
        <p>{t("field.unavailable")}</p>
      </section>
    );
  }

  return (
    <section className="field-data">
      <header className="field-data__header">
        <h3>{t("field.title")}</h3>
        {fieldData.collectionPeriod && (
          <span className="field-data__period">Período: {fieldData.collectionPeriod}</span>
        )}
      </header>
      <div className="metrics__list">
        {fieldData.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}