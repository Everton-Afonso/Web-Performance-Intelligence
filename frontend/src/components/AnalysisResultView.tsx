import type { Metric, AnalysisResult } from "@/types/analysis";
import { ScoreCard } from "./ScoreCard";
import { MetricCard } from "./MetricCard";
import { AuditList } from "./AuditList";
import { AnalysisSummary } from "./AnalysisSummary";
import { useI18n } from "@/i18n";

const PRIORITY_METRICS: Metric["id"][] = ["performance-score", "LCP", "INP", "CLS", "FCP", "TTFB"];

export interface AnalysisResultViewProps {
  result: AnalysisResult;
}

export function AnalysisResultView({ result }: AnalysisResultViewProps) {
  const { t } = useI18n();

  const ordered = PRIORITY_METRICS
    .map((id) => result.metrics.find((m) => m.id === id))
    .filter((m): m is Metric => m !== undefined);

  const scoreMetric = ordered.find((m) => m.id === "performance-score");

  return (
    <div className="results">
      <AnalysisSummary result={result} />

      <div className="results__grid">
        <ScoreCard score={scoreMetric?.value ?? result.performanceScore} />

        <section className="metrics" aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="metrics__title">
            {t("metrics.title")}
          </h2>
          <div className="metrics__list">
            {ordered
              .filter((m) => m.id !== "performance-score")
              .map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
          </div>
        </section>
      </div>

      <AuditList audits={result.audits} />
    </div>
  );
}