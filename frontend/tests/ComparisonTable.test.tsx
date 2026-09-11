import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparisonTable } from "../src/components/ComparisonTable";
import type { ComparisonResult } from "../src/types/analysis";

const comparison: ComparisonResult = {
  id: "c1",
  baselineAnalysisId: "a1",
  currentAnalysisId: "a2",
  createdAt: "2026-09-11T00:00:00Z",
  scoreBefore: 50,
  scoreAfter: 80,
  scoreDelta: 30,
  scorePct: 60,
  scoreDirection: "improved",
  metrics: [
    {
      metricId: "LCP",
      name: "LCP",
      before: { id: "LCP", name: "LCP", value: 3800, unit: "ms", status: "needs-improvement", displayValue: "3.8 s" },
      after: { id: "LCP", name: "LCP", value: 2100, unit: "ms", status: "good", displayValue: "2.1 s" },
      delta: -1700,
      pctChange: -44.7,
      direction: "improved"
    }
  ]
};

describe("ComparisonTable", () => {
  it("exibe evolução do score e das métricas", () => {
    render(<ComparisonTable comparison={comparison} />);
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getAllByText("Melhorou").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3.8 s")).toBeInTheDocument();
    expect(screen.getByText("2.1 s")).toBeInTheDocument();
    expect(screen.getByText("-44.7%")).toBeInTheDocument();
  });
});