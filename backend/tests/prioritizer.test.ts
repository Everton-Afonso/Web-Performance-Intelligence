import { describe, expect, it } from "vitest";
import {
  countAudits,
  impactForScore,
  prioritizeAudits,
  severityForScore
} from "../src/services/performance/prioritizer.js";
import type { ParsedAudit } from "../src/services/pagespeed/parser.js";

const failed: ParsedAudit[] = [
  {
    auditId: "offscreen-images",
    title: "Defer offscreen images",
    description: "Adiar imagens fora da tela.",
    score: 0.9,
    numericValue: 3
  },
  {
    auditId: "render-blocking-resources",
    title: "Eliminate render-blocking resources",
    description: "Recursos que bloqueiam a renderização.",
    score: 0.2,
    numericValue: 240
  },
  {
    auditId: "unused-css-rules",
    title: "Remove unused CSS",
    description: "CSS não utilizado.",
    score: null,
    numericValue: 0
  },
  {
    auditId: "unsized-images",
    title: "Image elements do not have explicit width and height",
    description: "Imagens sem dimensões.",
    score: 0,
    numericValue: 12
  }
];

describe("prioritizeAudits", () => {
  it("ordena audits por severidade e menor score primeiro (RF-16 / CA-06)", () => {
    const sorted = prioritizeAudits(failed);
    const ids = sorted.map((a) => a.auditId);
    expect(ids).toEqual([
      "unused-css-rules",
      "unsized-images",
      "render-blocking-resources",
      "offscreen-images"
    ]);
  });

  it("marca severidade e impacto", () => {
    const sorted = prioritizeAudits(failed);
    const [first, second, third, last] = sorted;
    expect(first!.severity).toBe("P0");
    expect(first!.impact).toBe("high");
    expect(second!.severity).toBe("P1");
    expect(second!.impact).toBe("high");
    expect(third!.severity).toBe("P2");
    expect(third!.impact).toBe("medium");
    expect(last!.severity).toBe("P2");
    expect(last!.impact).toBe("low");
  });
});

describe("severityForScore", () => {
  it("mapeia score para severidade", () => {
    expect(severityForScore(null)).toBe("P0");
    expect(severityForScore(0)).toBe("P1");
    expect(severityForScore(0.7)).toBe("P2");
  });
});

describe("impactForScore", () => {
  it("mapeia score para impacto", () => {
    expect(impactForScore(null)).toBe("high");
    expect(impactForScore(0)).toBe("high");
    expect(impactForScore(0.3)).toBe("medium");
    expect(impactForScore(0.8)).toBe("low");
  });
});

describe("countAudits", () => {
  it("conta totais e alto impacto", () => {
    const audits = prioritizeAudits(failed);
    expect(countAudits(audits)).toEqual({ total: 4, highImpact: 2 });
  });
});