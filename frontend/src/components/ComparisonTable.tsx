import type { ComparisonResult } from "@/types/analysis";
import { useI18n } from "@/i18n";

export interface ComparisonTableProps {
  comparison: ComparisonResult;
}

const DIRECTION_KEY: Record<ComparisonResult["scoreDirection"], string> = {
  improved: "compare.improved",
  regressed: "compare.regressed",
  unchanged: "compare.unchanged",
  unknown: "compare.unknown"
};

export function ComparisonTable({ comparison }: ComparisonTableProps) {
  const { t } = useI18n();

  return (
    <div className="comparison">
      <table className="comparison__table">
        <thead>
          <tr>
            <th>{t("compare.metric")}</th>
            <th>{t("compare.before")}</th>
            <th>{t("compare.after")}</th>
            <th>{t("compare.delta")}</th>
            <th>{t("compare.pct")}</th>
            <th>{t("compare.direction")}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="comparison__score">
            <td>{t("score.label")}</td>
            <td>{comparison.scoreBefore ?? "—"}</td>
            <td>{comparison.scoreAfter ?? "—"}</td>
            <td>{comparison.scoreDelta ?? "—"}</td>
            <td>{comparison.scorePct !== null ? `${comparison.scorePct.toFixed(1)}%` : "—"}</td>
            <td className={`comparison__dir comparison__dir--${comparison.scoreDirection}`}>
              {t(DIRECTION_KEY[comparison.scoreDirection])}
            </td>
          </tr>
          {comparison.metrics.map((m) => (
            <tr key={m.metricId}>
              <td>{m.name}</td>
              <td>{m.before?.displayValue ?? "—"}</td>
              <td>{m.after?.displayValue ?? "—"}</td>
              <td>{m.delta !== null ? m.delta.toFixed(2) : "—"}</td>
              <td>{m.pctChange !== null ? `${m.pctChange.toFixed(1)}%` : "—"}</td>
              <td className={`comparison__dir comparison__dir--${m.direction}`}>
                {t(DIRECTION_KEY[m.direction] ?? "compare.unknown")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}