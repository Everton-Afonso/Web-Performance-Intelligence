import { describe, expect, it } from "vitest";
import { normalizeMetric, normalizeMetrics } from "../src/services/performance/normalizer.js";

describe("normalizeMetric", () => {
  it("formata LCP em segundos e classifica estado (CA-05 / exemplo V1)", () => {
    const metric = normalizeMetric({
      id: "LCP",
      name: "Largest Contentful Paint",
      value: 3800,
      unit: "ms"
    });
    expect(metric.displayValue).toBe("3.8 s");
    expect(metric.status).toBe("needs-improvement");
    expect(metric.value).toBe(3800);
  });

  it("formata INP em milissegundos", () => {
    const metric = normalizeMetric({
      id: "INP",
      name: "Interaction to Next Paint",
      value: 180,
      unit: "ms"
    });
    expect(metric.displayValue).toBe("180 ms");
    expect(metric.status).toBe("good");
  });

  it("formata CLS com duas casas decimais (CA-05)", () => {
    const metric = normalizeMetric({
      id: "CLS",
      name: "Cumulative Layout Shift",
      value: 0.31,
      unit: ""
    });
    expect(metric.displayValue).toBe("0.31");
    expect(metric.status).toBe("poor");
  });

  it("formata TTFB em segundos", () => {
    const metric = normalizeMetric({
      id: "TTFB",
      name: "Time to First Byte",
      value: 1200,
      unit: "ms"
    });
    expect(metric.displayValue).toBe("1.2 s");
    expect(metric.status).toBe("needs-improvement");
  });

  it("marca métrica como não disponível quando sem valor", () => {
    const metric = normalizeMetric({
      id: "INP",
      name: "Interaction to Next Paint",
      value: null,
      unit: "ms"
    });
    expect(metric.value).toBeNull();
    expect(metric.status).toBeNull();
    expect(metric.displayValue).toBe("Não disponível");
  });

  it("normaliza o performance score (score 0..100)", () => {
    const metric = normalizeMetric({
      id: "performance-score",
      name: "Performance Score",
      value: 67,
      unit: "score"
    });
    expect(metric.displayValue).toBe("67");
    expect(metric.status).toBe("needs-improvement");
  });
});

describe("normalizeMetrics", () => {
  it("processa uma lista de métricas", () => {
    const metrics = normalizeMetrics([
      { id: "CLS", name: "Cumulative Layout Shift", value: 0.06, unit: "" },
      { id: "FCP", name: "First Contentful Paint", value: 2100, unit: "ms" }
    ]);
    expect(metrics).toHaveLength(2);
    expect(metrics[0]!.status).toBe("good");
    expect(metrics[1]!.status).toBe("needs-improvement");
    expect(metrics[1]!.displayValue).toBe("2.1 s");
  });
});