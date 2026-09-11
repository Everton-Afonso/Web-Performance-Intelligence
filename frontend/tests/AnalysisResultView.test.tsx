import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalysisResultView } from "../src/components/AnalysisResultView";
import type { AnalysisResult } from "../src/types/analysis";

const result: AnalysisResult = {
  id: "id-1",
  requestedUrl: "https://meusite.com",
  finalUrl: "https://meusite.com/pt-br",
  strategy: "mobile",
  analyzedAt: "2026-09-10T12:00:00.000Z",
  performanceScore: 67,
  metrics: [
    { id: "performance-score", name: "Performance Score", value: 67, unit: "score", status: "needs-improvement", displayValue: "67" },
    { id: "LCP", name: "Largest Contentful Paint", value: 3800, unit: "ms", status: "needs-improvement", displayValue: "3.8 s" },
    { id: "INP", name: "Interaction to Next Paint", value: 180, unit: "ms", status: "good", displayValue: "180 ms" },
    { id: "CLS", name: "Cumulative Layout Shift", value: 0.31, unit: "", status: "poor", displayValue: "0.31" },
    { id: "FCP", name: "First Contentful Paint", value: 2100, unit: "ms", status: "needs-improvement", displayValue: "2.1 s" },
    { id: "TTFB", name: "Time to First Byte", value: 1200, unit: "ms", status: "needs-improvement", displayValue: "1.2 s" }
  ],
  audits: [
    {
      auditId: "unsized-images",
      title: "Imagens sem dimensões explícitas",
      description: "Podem causar CLS.",
      score: 0,
      displayValue: "12 images",
      numericValue: 12,
      severity: "P1",
      impact: "high"
    }
  ],
  failedAuditsCount: 1,
  highImpactCount: 1,
  warnings: []
};

describe("AnalysisResultView", () => {
  it("renderiza score, núcleo vitals e problemas", () => {
    render(<AnalysisResultView result={result} />);

    expect(screen.getByText("67")).toBeInTheDocument();
    expect(screen.getByText("3.8 s")).toBeInTheDocument();
    expect(screen.getByText("0.31")).toBeInTheDocument();
    expect(screen.getByText("Core Web Vitals")).toBeInTheDocument();
    expect(screen.getByText("Imagens sem dimensões explícitas")).toBeInTheDocument();
    expect(screen.getByText("Problemas prioritários")).toBeInTheDocument();
  });

  it("exibe URL final após redirecionamento (RF-08)", () => {
    render(<AnalysisResultView result={result} />);
    expect(screen.getByText("https://meusite.com/pt-br")).toBeInTheDocument();
  });

  it("mostra a lista de audits vazia com mensagem", () => {
    render(<AnalysisResultView result={{ ...result, audits: [], failedAuditsCount: 0, highImpactCount: 0 }} />);
    expect(screen.getByText(/Não há problemas de performance/i)).toBeInTheDocument();
  });
});