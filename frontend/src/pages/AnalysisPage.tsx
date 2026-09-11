import { useI18n } from "@/i18n";
import { AnalysisForm } from "@/components/AnalysisForm";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { AnalysisBothView } from "@/components/AnalysisBothView";
import { LoadingState } from "@/components/LoadingState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useAnalysis } from "@/hooks/useAnalysis";
import type { AnalysisBothResult, AnalysisResult } from "@/types/analysis";

function isBoth(result: AnalysisResult | AnalysisBothResult): result is AnalysisBothResult {
  return "mobile" in result && "desktop" in result;
}

export default function AnalysisPage() {
  const { t } = useI18n();
  const { state, url, strategy, setUrl, setStrategy, run, retry } = useAnalysis();

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">{t("app.title")}</h1>
        <p className="page__tagline">{t("app.tagline")}</p>
      </header>

      <AnalysisForm
        busy={state.status === "loading"}
        initialUrl={url}
        initialStrategy={strategy}
        onSubmit={(submittedUrl, submittedStrategy) => {
          setUrl(submittedUrl);
          setStrategy(submittedStrategy);
          void run({ url: submittedUrl, strategy: submittedStrategy });
        }}
      />

      {state.status === "loading" && <LoadingState />}

      {state.status === "error" && <ErrorMessage message={state.message} onRetry={retry} />}

      {state.status === "success" &&
        (isBoth(state.result) ? (
          <AnalysisBothView result={state.result} />
        ) : (
          <AnalysisResultView result={state.result} />
        ))}
    </main>
  );
}