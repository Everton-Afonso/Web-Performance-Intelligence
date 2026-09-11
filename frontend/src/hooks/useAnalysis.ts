import { useRef, useState } from "react";
import type { AnalysisResult, Strategy } from "@/types/analysis";
import { analyzeUrl, ApiRequestError } from "@/services/api";

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: AnalysisResult }
  | { status: "error"; message: string };

const DEFAULT_STRATEGY: Strategy = "mobile";

export interface AnalyzeOptions {
  url: string;
  strategy: Strategy;
}

/**
 * Drives the analysis flow on the frontend (RF-12): keeps loading state and
 * prevents duplicated submissions while a request is in progress.
 */
export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [strategy, setStrategy] = useState<Strategy>(DEFAULT_STRATEGY);
  const [url, setUrl] = useState("");
  const inFlight = useRef(false);
  const lastRequest = useRef<AnalyzeOptions | null>(null);

  async function run(options: AnalyzeOptions): Promise<void> {
    if (inFlight.current) {
      return; // RF-12: block duplicated actions during processing
    }
    inFlight.current = true;
    lastRequest.current = options;
    setState({ status: "loading" });

    try {
      const result = await analyzeUrl(options.url, options.strategy);
      setUrl(options.url);
      setStrategy(options.strategy);
      setState({ status: "success", result });
    } catch (err) {
      const message =
        err instanceof ApiRequestError || err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado. Tente novamente.";
      setState({ status: "error", message });
    } finally {
      inFlight.current = false;
    }
  }

  async function retry(): Promise<void> {
    if (lastRequest.current) {
      await run(lastRequest.current);
    }
  }

  return { state, url, strategy, setUrl, setStrategy, run, retry };
}