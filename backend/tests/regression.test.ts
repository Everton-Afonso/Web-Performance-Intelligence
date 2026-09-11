import { describe, expect, it } from "vitest";
import { detectRegressions, evaluateGoals } from "../src/services/performance/regression.js";
import type { AnalysisRecord, GoalRecord } from "../src/types/storage.js";

function makeRecord(overrides: Partial<AnalysisRecord> = {}): AnalysisRecord {
  return {
    id: "a",
    siteId: "s",
    site: { id: "s", name: "site", url: "https://site.com" },
    url: "https://site.com",
    finalUrl: "https://site.com",
    strategy: "mobile",
    score: 67,
    analyzedAt: "2026-09-01T00:00:00Z",
    fetchTime: "2026-09-01T00:00:00Z",
    fieldData: null,
    metrics: [],
    audits: [],
    recommendations: [],
    ...overrides
  };
}

function rec(score: number, metrics: AnalysisRecord["metrics"]): AnalysisRecord {
  return makeRecord({ score, metrics });
}

describe("detectRegressions", () => {
  it("detecta downgrade de status como regressão (alta)", () => {
    const previous = rec(90, [
      { id: "LCP", name: "LCP", value: 1800, unit: "ms", status: "good", displayValue: "1.8 s" },
      { id: "CLS", name: "CLS", value: 0.05, unit: "", status: "good", displayValue: "0.05" }
    ]);
    const current = rec(45, [
      { id: "LCP", name: "LCP", value: 3200, unit: "ms", status: "needs-improvement", displayValue: "3.2 s" },
      { id: "CLS", name: "CLS", value: 0.31, unit: "", status: "poor", displayValue: "0.31" }
    ]);
    const findings = detectRegressions(previous, current);

    const lcp = findings.find((f) => f.metric === "LCP")!;
    const cls = findings.find((f) => f.metric === "CLS")!;
    expect(lcp).toBeDefined();
    expect(lcp.severity).toBe("medium"); // needs-improvement
    expect(cls).toBeDefined();
    expect(cls.severity).toBe("high"); // poor
    expect(cls.message).toMatch(/regrediu/);
  });

  it("detecta regressão numérica além da tolerância (+15%)", () => {
    const previous = rec(80, [
      { id: "TTFB", name: "TTFB", value: 700, unit: "ms", status: "good", displayValue: "0.7 s" },
      { id: "LCP", name: "LCP", value: 2200, unit: "ms", status: "needs-improvement", displayValue: "2.2 s" }
    ]);
    const current = rec(78, [
      { id: "TTFB", name: "TTFB", value: 900, unit: "ms", status: "good", displayValue: "0.9 s" },
      { id: "LCP", name: "LCP", value: 2300, unit: "ms", status: "needs-improvement", displayValue: "2.3 s" }
    ]);
    const findings = detectRegressions(previous, current);
    expect(findings.find((f) => f.metric === "TTFB")).toBeDefined(); // 900 > 700*1.15
    expect(findings.find((f) => f.metric === "LCP")).toBeUndefined(); // +4.5% não relevante
  });

  it("não acusa regressão quando houve melhora", () => {
    const previous = rec(40, [
      { id: "LCP", name: "LCP", value: 4200, unit: "ms", status: "poor", displayValue: "4.2 s" }
    ]);
    const current = rec(90, [
      { id: "LCP", name: "LCP", value: 2100, unit: "ms", status: "good", displayValue: "2.1 s" }
    ]);
    expect(detectRegressions(previous, current)).toHaveLength(0);
  });

  it("detecta queda de performance score", () => {
    const previous = rec(90, []);
    const current = rec(60, []);
    const findings = detectRegressions(previous, current);
    const score = findings.find((f) => f.metric === "performance-score");
    expect(score).toBeUndefined(); // sem métrica nomeada performance-score nas metrics; score é coluna
  });
});

describe("evaluateGoals", () => {
  const goals: GoalRecord[] = [
    { id: "g1", siteId: "s", metric: "LCP", target: 2500, operator: "lte", createdAt: "2026-09-01T00:00:00Z" },
    { id: "g2", siteId: "s", metric: "performance-score", target: 80, operator: "gte", createdAt: "2026-09-01T00:00:00Z" }
  ];

  it("marca metas cumpridas e não cumpridas", () => {
    const analysis = rec(85, [
      { id: "performance-score", name: "Performance Score", value: 85, unit: "score", status: "needs-improvement", displayValue: "85" },
      { id: "LCP", name: "LCP", value: 2400, unit: "ms", status: "good", displayValue: "2.4 s" }
    ]);
    const evals = evaluateGoals(goals, analysis);
    expect(evals[0]!.met).toBe(true); // LCP 2400 <= 2500
    expect(evals[1]!.met).toBe(true); // score 85 >= 80
  });

  it("acusa meta não cumprida", () => {
    const analysis = rec(55, [
      { id: "performance-score", name: "Performance Score", value: 55, unit: "score", status: "needs-improvement", displayValue: "55" },
      { id: "LCP", name: "LCP", value: 3200, unit: "ms", status: "needs-improvement", displayValue: "3.2 s" }
    ]);
    const evals = evaluateGoals(goals, analysis);
    expect(evals[0]!.met).toBe(false);
    expect(evals[0]!.message).toMatch(/NÃO atingiu/i);
    expect(evals[1]!.met).toBe(false);
  });
});