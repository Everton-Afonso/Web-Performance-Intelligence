import { describe, expect, it } from "vitest";
import { diagnose, hasHighImpact } from "../src/services/ai/diagnostic.js";
import type { Audit, Metric } from "../src/types/analysis.js";

const poorMetrics: Metric[] = [
  { id: "performance-score", name: "Performance Score", value: 40, unit: "score", status: "poor", displayValue: "40" },
  { id: "LCP", name: "Largest Contentful Paint", value: 4200, unit: "ms", status: "poor", displayValue: "4.2 s" },
  { id: "CLS", name: "Cumulative Layout Shift", value: 0.34, unit: "", status: "poor", displayValue: "0.34" },
  { id: "FCP", name: "First Contentful Paint", value: 2100, unit: "ms", status: "needs-improvement", displayValue: "2.1 s" }
];

const failedAudits: Audit[] = [
  {
    auditId: "unsized-images",
    title: "Image elements do not have explicit width and height",
    description: "Imagens sem dimensões explícitas.",
    score: 0,
    numericValue: 14,
    severity: "P1",
    impact: "high"
  },
  {
    auditId: "render-blocking-resources",
    title: "Eliminate render-blocking resources",
    description: "Recursos que bloqueiam a renderização.",
    score: 0.3,
    numericValue: 3,
    severity: "P2",
    impact: "medium"
  },
  {
    auditId: "unused-javascript",
    title: "Remove unused JavaScript",
    description: "JS não utilizado.",
    score: 0.1,
    numericValue: 240,
    severity: "P2",
    impact: "medium"
  }
];

describe("diagnose", () => {
  it("gera recomendações a partir de audits e métricas (prioridade por evidência)", () => {
    const recommendations = diagnose({ metrics: poorMetrics, audits: failedAudits });

    expect(recommendations.length).toBeGreaterThanOrEqual(3);

    const image = recommendations.find((r) => r.targetId === "unsized-images");
    expect(image).toBeDefined();
    expect(image!.priority).toBe("P0");
    expect(image!.cause).toMatch(/causa provável|causa provável/i);
    expect(image!.expectedImpact).toBe("high");
    expect(image!.suggestedFix).toContain("width");
    expect(image!.evidence).toContain("Image elements do not have explicit width and height");

    const renderBlocking = recommendations.find((r) => r.targetId === "render-blocking-resources");
    expect(renderBlocking).toBeDefined();
    expect(renderBlocking!.category).toBe("LCP");
  });

  it("evita duplicar recomendação de mesma categoria (audit tem prioridade sobre métrica)", () => {
    const recommendations = diagnose({ metrics: poorMetrics, audits: failedAudits });
    const lcp = recommendations.filter((r) => r.category === "LCP");
    // audit render-blocking entrou uma vez; métrica LCP não duplica
    expect(lcp.length).toBe(1);
  });

  it("usa fallback por métrica quando não há audit direcionado", () => {
    const recommendations = diagnose({
      metrics: poorMetrics,
      audits: [
        { auditId: "canonical", title: "valid", description: "d", score: 1, numericValue: null, severity: "P2", impact: "low" }
      ]
    });
    const cls = recommendations.find((r) => r.targetId === "CLS");
    expect(cls).toBeDefined();
    expect(cls!.targetType).toBe("metric");
    expect(cls!.cause).toMatch(/reservado/i);
  });

  it("não gera nada sem problemas", () => {
    const goodAudits = [
      { auditId: "canonical", title: "ok", description: "d", score: 1, numericValue: null, severity: "P2", impact: "low" }
    ];
    const recommendations = diagnose({
      metrics: [
        { id: "LCP", name: "LCP", value: 1800, unit: "ms", status: "good", displayValue: "1.8 s" },
        { id: "CLS", name: "CLS", value: 0.05, unit: "", status: "good", displayValue: "0.05" }
      ],
      audits: goodAudits
    });
    expect(recommendations).toHaveLength(0);
    expect(hasHighImpact(recommendations)).toBe(false);
  });

  it("ordena por prioridade P0 primeiro", () => {
    const recommendations = diagnose({ metrics: poorMetrics, audits: failedAudits });
    const order = recommendations.map((r) => r.priority);
    const position: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
    for (let i = 1; i < order.length; i++) {
      expect(position[order[i]!]!).toBeGreaterThanOrEqual(position[order[i - 1]!]!);
    }
    expect(order[0]).toBe("P0");
  });
});