import { describe, expect, it } from "vitest";
import {
  extractFailedAudits,
  extractFinalUrl,
  extractPerformanceMetrics,
  extractPerformanceScore,
  extractWarnings
} from "../src/services/pagespeed/parser.js";
import { psiFixture } from "./fixtures/pagespeed.fixture.js";

const lighthouse = psiFixture.lighthouseResult!;

describe("extractPerformanceMetrics", () => {
  const metrics = extractPerformanceMetrics(lighthouse);
  const byId = Object.fromEntries(metrics.map((m) => [m.id, m]));

  it("extrai as cinco métricas principais (RF-13)", () => {
    for (const id of ["LCP", "INP", "CLS", "FCP", "TTFB"] as const) {
      expect(byId[id]).toBeDefined();
    }
  });

  it("extrai valores nativos corretos", () => {
    expect(byId["LCP"]!.value).toBe(3800);
    expect(byId["INP"]!.value).toBe(180);
    expect(byId["CLS"]!.value).toBe(0.31);
    expect(byId["FCP"]!.value).toBe(2100);
    expect(byId["TTFB"]!.value).toBe(1200);
    expect(byId["TBT"]!.value).toBe(450);
  });

  it("define unidades consistentes", () => {
    expect(byId["LCP"]!.unit).toBe("ms");
    expect(byId["CLS"]!.unit).toBe("");
  });
});

describe("extractPerformanceScore", () => {
  it("converte score 0..1 em 0..100 (RF-04)", () => {
    expect(extractPerformanceScore(lighthouse)).toBe(67);
  });

  it("retorna null quando não há categoria de performance", () => {
    expect(extractPerformanceScore({ categories: {} } as never)).toBeNull();
  });
});

describe("extractFailedAudits", () => {
  it("inclui apenas audits com score < 1 (RF-07)", () => {
    const audits = extractFailedAudits(lighthouse);
    const ids = audits.map((a) => a.auditId);
    expect(ids).toContain("largest-contentful-paint");
    expect(ids).toContain("unsized-images");
    expect(ids).toContain("render-blocking-resources");
    expect(ids).toContain("offscreen-images");
    expect(ids).not.toContain("canonical");
  });

  it("inclui audits com score null (modo error) (CA-06)", () => {
    const audits = extractFailedAudits(lighthouse);
    const unusedCss = audits.find((a) => a.auditId === "unused-css-rules");
    expect(unusedCss).toBeDefined();
    expect(unusedCss!.score).toBeNull();
    expect(unusedCss!.displayValue).toBe("No CSS rules found");
  });

  it("retorna lista vazia para lighthouse sem audits", () => {
    expect(extractFailedAudits({ audits: {} } as never)).toEqual([]);
    expect(extractFailedAudits(undefined)).toEqual([]);
  });
});

describe("extractFinalUrl", () => {
  it("usa a URL final após redirecionamentos (RF-08)", () => {
    expect(extractFinalUrl(lighthouse, "https://meusite.com")).toBe("https://meusite.com/pt-br");
  });

  it("usa a URL solicitada quando não houver final", () => {
    expect(extractFinalUrl(undefined, "https://meusite.com")).toBe("https://meusite.com");
  });
});

describe("extractWarnings", () => {
  it("gera warnings apenas com runtimeError", () => {
    expect(extractWarnings(lighthouse)).toEqual([]);
    expect(
      extractWarnings({ runtimeError: { code: "NO_FCP" } } as never)
    ).toEqual(["Erro de runtime no Lighthouse: NO_FCP"]);
  });
});