import { describe, expect, it } from "vitest";
import { classifyMetric, classifyScore, THRESHOLDS } from "../src/services/performance/classifier.js";

describe("classifyMetric", () => {
  it("classifica LCP (segundos)", () => {
    expect(classifyMetric("LCP", 2.4)).toBe("good");
    expect(classifyMetric("LCP", 2.5)).toBe("good");
    expect(classifyMetric("LCP", 3.8)).toBe("needs-improvement");
    expect(classifyMetric("LCP", 4.1)).toBe("poor");
  });

  it("classifica INP (milissegundos)", () => {
    expect(classifyMetric("INP", 180)).toBe("good");
    expect(classifyMetric("INP", 200)).toBe("good");
    expect(classifyMetric("INP", 450)).toBe("needs-improvement");
    expect(classifyMetric("INP", 520)).toBe("poor");
  });

  it("classifica CLS", () => {
    expect(classifyMetric("CLS", 0.05)).toBe("good");
    expect(classifyMetric("CLS", 0.1)).toBe("good");
    expect(classifyMetric("CLS", 0.18)).toBe("needs-improvement");
    expect(classifyMetric("CLS", 0.31)).toBe("poor");
  });

  it("classifica FCP", () => {
    expect(classifyMetric("FCP", 1.7)).toBe("good");
    expect(classifyMetric("FCP", 2.1)).toBe("needs-improvement");
    expect(classifyMetric("FCP", 3.2)).toBe("poor");
  });

  it("classifica TTFB", () => {
    expect(classifyMetric("TTFB", 0.6)).toBe("good");
    expect(classifyMetric("TTFB", 1.2)).toBe("needs-improvement");
    expect(classifyMetric("TTFB", 2.0)).toBe("poor");
  });

  it("retorna null para métrica sem limites definidos", () => {
    expect(classifyMetric("performance-score", 67)).toBeNull();
  });
});

describe("classifyScore", () => {
  it("classifica scores de performance", () => {
    expect(classifyScore(95)).toBe("good");
    expect(classifyScore(90)).toBe("good");
    expect(classifyScore(67)).toBe("needs-improvement");
    expect(classifyScore(50)).toBe("needs-improvement");
    expect(classifyScore(20)).toBe("poor");
  });
});

describe("THRESHOLDS (seção 2 do documento)", () => {
  it("mantém os limites documentados para LCP, INP e CLS", () => {
    expect(THRESHOLDS.LCP).toEqual({ goodMax: 2.5, poorMin: 4 });
    expect(THRESHOLDS.INP).toEqual({ goodMax: 200, poorMin: 500 });
    expect(THRESHOLDS.CLS).toEqual({ goodMax: 0.1, poorMin: 0.25 });
  });
});