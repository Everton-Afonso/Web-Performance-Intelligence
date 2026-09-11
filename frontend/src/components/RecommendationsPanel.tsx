import type { Recommendation } from "@/types/analysis";
import { useI18n } from "@/i18n";

export interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

const IMPACT_KEY: Record<Recommendation["expectedImpact"], string> = {
  high: "rec.impact.high",
  medium: "rec.impact.medium",
  low: "rec.impact.low"
};

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const { t } = useI18n();

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="recs" aria-labelledby="recs-heading">
      <header className="recs__header">
        <h2 id="recs-heading" className="recs__title">
          {t("rec.title")}
        </h2>
        <p className="recs__subtitle">{t("rec.subtitle")}</p>
      </header>

      <ol className="recs__list">
        {recommendations.map((rec, i) => (
          <li key={`${rec.targetType}-${rec.targetId}-${i}`} className={`rec rec--${rec.priority.toLowerCase()}`}>
            <header className="rec__top">
              <span className="rec__priority">{rec.priority}</span>
              <strong className="rec__title">{rec.title}</strong>
              <span className={`rec__impact rec__impact--${rec.expectedImpact}`}>{t("rec.impact")}: {t(IMPACT_KEY[rec.expectedImpact])}</span>
            </header>

            <p className="rec__problem">
              <strong>{t("rec.problem")}:</strong> {rec.description}
            </p>

            <p className="rec__cause">
              <strong>{t("rec.cause")}:</strong> {rec.cause}
            </p>

            <p className="rec__fix">
              <strong>{t("rec.recommendation")}:</strong> {rec.recommendedFix}
            </p>

            {rec.evidence.length > 0 && (
              <ul className="rec__evidence">
                {rec.evidence.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            )}

            {rec.suggestedFix && (
              <pre className="rec__code" data-testid="rec-code">
                <code>{rec.suggestedFix}</code>
              </pre>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}