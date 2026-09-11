import type { AnalysisBothResult } from "@/types/analysis";
import { useI18n } from "@/i18n";
import { AnalysisResultView } from "./AnalysisResultView";

export interface AnalysisBothViewProps {
  result: AnalysisBothResult;
}

/**
 * PSI-style side-by-side view: renders mobile and desktop analyses (each with
 * its own metrics/audits/recommendations) without mixing them.
 */
export function AnalysisBothView({ result }: AnalysisBothViewProps) {
  const { t } = useI18n();

  return (
    <div className="dual">
      <section className="dual__column">
        <h2 className="dual__heading dual__heading--mobile">{t("form.strategy.mobile")}</h2>
        <AnalysisResultView result={result.mobile} />
      </section>

      <section className="dual__column">
        <h2 className="dual__heading dual__heading--desktop">{t("form.strategy.desktop")}</h2>
        <AnalysisResultView result={result.desktop} />
      </section>
    </div>
  );
}