import type { AnalysisResult } from "@/types/analysis";
import { useI18n } from "@/i18n";

export interface AnalysisSummaryProps {
  result: AnalysisResult;
}

export function AnalysisSummary({ result }: AnalysisSummaryProps) {
  const { t, date } = useI18n();

  return (
    <section className="analysis-meta" aria-label={t("summary.title")}>
      <div className="analysis-meta__counts">
        <p className="analysis-meta__count">
          <strong>{result.failedAuditsCount}</strong>
          <span>{t("summary.problems")}</span>
        </p>
        <p className="analysis-meta__count analysis-meta__count--high">
          <strong>{result.highImpactCount}</strong>
          <span>{t("summary.high")}</span>
        </p>
      </div>

      <dl className="analysis-meta__details">
        <div>
          <dt>{t("result.label.requested")}</dt>
          <dd>{result.requestedUrl}</dd>
        </div>
        {result.finalUrl !== result.requestedUrl && (
          <div>
            <dt>{t("result.label.final")}</dt>
            <dd>{result.finalUrl}</dd>
          </div>
        )}
        <div>
          <dt>{t("result.label.strategy")}</dt>
          <dd className="analysis-meta__strategy">
            {result.strategy === "mobile"
              ? t("form.strategy.mobile")
              : t("form.strategy.desktop")}
          </dd>
        </div>
        <div>
          <dt>{t("result.label.date")}</dt>
          <dd>{date(result.analyzedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}