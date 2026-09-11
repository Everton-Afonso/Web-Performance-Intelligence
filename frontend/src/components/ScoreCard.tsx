import { useI18n } from "@/i18n";

export interface ScoreCardProps {
  score: number | null;
}

const STATUS_TEXT_KEY: Record<"good" | "needs-improvement" | "poor", string> = {
  good: "status.good",
  "needs-improvement": "status.needs-improvement",
  poor: "status.poor"
};

function statusForScore(score: number | null): "good" | "needs-improvement" | "poor" | null {
  if (score === null) return null;
  if (score >= 90) return "good";
  if (score >= 50) return "needs-improvement";
  return "poor";
}

export function ScoreCard({ score }: ScoreCardProps) {
  const { t } = useI18n();
  const status = statusForScore(score);

  return (
    <section
      className={`score-card ${status ? `score-card--${status}` : ""}`}
      aria-label="Performance score"
    >
      <div className="score-card__ring" role="img" aria-label={`${t("score.label")}: ${score ?? "—"}`}>
        <div className="score-card__value">
          <strong>{score === null ? "—" : score}</strong>
        </div>
      </div>
      <div className="score-card__meta">
        <span className="score-card__status">
          {status ? t(STATUS_TEXT_KEY[status]) : t("metric.unavailable")}
        </span>
        <span className="score-card__hint">{t("score.label")}</span>
      </div>
    </section>
  );
}