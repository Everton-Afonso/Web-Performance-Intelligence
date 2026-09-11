import type { Metric, MetricStatus } from "@/types/analysis";
import { useI18n } from "@/i18n";

export interface MetricCardProps {
  metric: Metric;
}

const STATUS_KEY: Record<MetricStatus, string> = {
  good: "status.good",
  "needs-improvement": "status.needs-improvement",
  poor: "status.poor"
};

export function MetricCard({ metric }: MetricCardProps) {
  const { t } = useI18n();
  const status = metric.status;

  return (
    <article
      className={`metric-card metric-card--${status ?? "unrated"}`}
      data-status={status ?? "unrated"}
    >
      <header className="metric-card__header">
        <span className="metric-card__name">{metric.name}</span>
        <span className="metric-card__pill" aria-hidden="true">
          {metric.id}
        </span>
      </header>

      <p className="metric-card__value" aria-label={`${metric.name}: ${metric.displayValue}`}>
        {metric.displayValue}
      </p>

      <footer className="metric-card__footer">
        <span
          className={`metric-status metric-status--${status ?? "unrated"}`}
          role="status"
          aria-label={status ? t(STATUS_KEY[status]) : t("metric.unavailable")}
        >
          {status ? t(STATUS_KEY[status]) : t("metric.unavailable")}
        </span>
      </footer>
    </article>
  );
}