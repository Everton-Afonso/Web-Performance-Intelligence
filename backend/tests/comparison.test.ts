import { describe, expect, it } from "vitest";
import { buildComparison, buildMetricComparison } from "../src/services/performance/comparison.js";
import type { AnalysisRecord } from "../src/types/storage.js";

function makeAnalysis(overrides: Partial<AnalysisRecord> = {}): AnalysisRecord {
  return {
    id: "a1",
    siteId: "s1",
    site: { id: "s1", name: "meusite", url: "https://meusite.com" },
    url: "https://meusite.com",
    finalUrl: "https://meusite.com",
    strategy: "mobile",
    score: 67,
    analyzedAt: "2026-09-01T12:00:00Z",
    fetchTime: "2026-09-01T12:00:00Z",
    fieldData: null,
    metrics: [
      { id: "performance-score", name: "Performance Score", value: 67, unit: "score", status: "needs-improvement", displayValue: "67" },
      { id: "LCP", name: "Largest Contentful Paint", value: 3800, unit: "ms", status: "needs-improvement", displayValue: "3.8 s" },
      { id: "CLS", name: "Cumulative Layout Shift", value: 0.31, unit: "", status: "poor", displayValue: "0.31" }
    ],
    audits: [],
    ...overrides
  };
}

const baseline = makeAnalysis({
  id: "baseline",
  score: 50,
  metrics: [
    { id: "performance-score", name: "Performance Score", value: 50, unit: "score", status: "needs-improvement", displayValue: "50" },
    { id: "LCP", name: "Largest Contentful Paint", value: 3800, unit: "ms", status: "needs-improvement", displayValue: "3.8 s" },
    { id: "INP", name: "Interaction to Next Paint", value: 280, unit: "ms", status: "needs-improvement", displayValue: "280 ms" },
    { id: "CLS", name: "Cumulative Layout Shift", value: 0.31, unit: "", status: "poor", displayValue: "0.31" }
  ]
});

const current = makeAnalysis({
  id: "current",
  score: 80,
  metrics: [
    { id: "performance-score", name: "Performance Score", value: 80, unit: "score", status: "needs-improvement", displayValue: "80" },
    { id: "LCP", name: "Largest Contentful Paint", value: 2100, unit: "ms", status: "needs-improvement", displayValue: "2.1 s" },
    { id: "INP", name: "Interaction to Next Paint", value: 145, unit: "ms", status: "good", displayValue: "145 ms" },
    { id: "CLS", name: "Cumulative Layout Shift", value: 0.06, unit: "", status: "good", displayValue: "0.06" }
  ]
});

describe("buildComparison", () => {
  it("calcula score e métricas antes/depois", () => {
    const result = buildComparison(baseline, current);
    expect(result.scoreBefore).toBe(50);
    expect(result.scoreAfter).toBe(80);
    expect(result.scoreDelta).toBe(30);
    expect(result.scorePct).toBeCloseTo(60, 1);
    expect(result.scoreDirection).toBe("improved");
  });

  it("marca evolução das métricas (melhora quando valor diminui)", () => {
    const result = buildComparison(baseline, current);
    const lcp = result.metrics.find((m) => m.metricId === "LCP")!;
    const cls = result.metrics.find((m) => m.metricId === "CLS")!;
    expect(lcp.direction).toBe("improved");
    expect(lcp.pctChange).toBeCloseTo(-44.7, 1);
    expect(cls.direction).toBe("improved");
  });

  it("detecta regressão", () => {
    const regressedBaseline = current;
    const worsened = makeAnalysis({
      id: "worse",
      score: 40,
      metrics: [
        { id: "performance-score", name: "Performance Score", value: 40, unit: "score", status: "poor", displayValue: "40" },
        { id: "LCP", name: "Largest Contentful Paint", value: 4900, unit: "ms", status: "poor", displayValue: "4.9 s" }
      ]
    });
    const result = buildComparison(regressedBaseline, worsened);
    expect(result.scoreDirection).toBe("regressed");
    expect(result.metrics.find((m) => m.metricId === "LCP")!.direction).toBe("regressed");
  });

  it("considera valores ausentes", () => {
    const noData = makeAnalysis({ id: "nodata", score: 55, metrics: [] });
    const result = buildComparison(baseline, noData);
    expect(result.metrics.length).toBeGreaterThan(0);
    const withNoAfter = result.metrics.find((m) => m.metricId === "INP")!;
    expect(withNoAfter.after).toBeNull();
  });
});

describe("buildMetricComparison", () => {
  it("marca unknown quando não há dados", () => {
    const result = buildMetricComparison("LCP", "LCP", null, null);
    expect(result.direction).toBe("unknown");
    expect(result.delta).toBeNull();
  });
});