import { describe, expect, it, vi } from "vitest";
import { parseWebPageTestResult } from "../src/services/webpagetest/parser.js";
import { WebPageTestService, WebPageTestAuthError, WebPageTestError, WebPageTestTimeoutError } from "../src/services/webpagetest/client.js";
import { shouldSuggestWebPageTest } from "../src/services/webpagetest/severity.js";

const wptPayload = {
  statusCode: 200,
  data: {
    testInfo: { location: "Dulles_MotoG4", browser: "Moto G4" },
    runs: {
      "1": {
        firstView: {
          bytesIn: 1_250_000,
          requestsCount: 42,
          TTFB: 380,
          FCP: 1200,
          LCP: 2400,
          CLS: 0.04,
          requests: [
            {
              url: "https://cdn.ex.com/img/banner.jpg",
              host: "cdn.ex.com",
              contentType: "image",
              startTime: 120,
              loadTime: 1500,
              bytesIn: 800_000
            },
            {
              url: "https://csr.meusite.com/app.js",
              host: "csr.meusite.com",
              contentType: "application/javascript",
              startTime: 40,
              loadTime: 700,
              bytesIn: 200_000
            },
            {
              url: "https://geral.ex.com/tracker.js",
              host: "geral.ex.com",
              contentType: "script",
              startTime: 10,
              loadTime: 60,
              bytesIn: 50_000
            }
          ]
        }
      }
    }
  }
};

describe("parseWebPageTestResult", () => {
  // parser recebe o corpo.data do jsonResult (a parte com runs/testInfo)
  const parsed = parseWebPageTestResult(wptPayload.data, "TEST-123", "https://meusite.com/");

  it("extrai métricas normalizadas com source wpt", () => {
    const byId = Object.fromEntries(parsed.metrics.map((m) => [m.id, m]));
    expect(byId["LCP"]!.value).toBe(2400);
    expect(byId["LCP"]!.source).toBe("wpt");
    expect(byId["LCP"]!.status).toBe("good");
    expect(byId["TTFB"]!.value).toBe(380);
    expect(byId["CLS"]!.value).toBe(0.04);
  });

  it("contabiliza requests e bytes", () => {
    expect(parsed.requests).toBe(42);
    expect(parsed.bytes).toBe(1_250_000);
    expect(parsed.testId).toBe("TEST-123");
  });

  it("ordena top requests por loadTime e marca terceiros", () => {
    expect(parsed.topRequests).toHaveLength(3);
    expect(parsed.topRequests[0]!.url).toBe("https://cdn.ex.com/img/banner.jpg");
    expect(parsed.topRequests[0]!.isThirdParty).toBe(true);
    expect(parsed.topRequests[2]!.isThirdParty).toBe(true);
    expect(parsed.waterfallRef).toContain("TEST-123");
  });

  it("tolera payload sem métricas", () => {
    const empty = parseWebPageTestResult({ data: { runs: {} } }, "X", "https://a.com");
    expect(empty.metrics).toHaveLength(0);
    expect(empty.requests).toBe(0);
  });
});

describe("WebPageTestService", () => {
  it("não habilita sem chave (RF-26)", () => {
    expect(new WebPageTestService({}).isEnabled()).toBe(false);
    expect(new WebPageTestService({ apiKey: "x" }).isEnabled()).toBe(true);
  });

  it("dispatch usa location mobile e devolve testId/jsonUrl", async () => {
    const fetchFn = vi.fn(async (u: string | URL | Request) => {
      const parsed = new URL(String(u));
      expect(parsed.searchParams.get("location")).toBe("Dulles_MotoG4");
      expect(parsed.searchParams.get("k")).toBe("key");
      return {
        ok: true,
        status: 200,
        json: async () => ({ statusCode: 200, data: { testId: "T1", jsonUrl: "https://x/jsonResult.php?test=T1" } }),
        text: async () => ""
      } as unknown as Response;
    });
    const service = new WebPageTestService({ apiKey: "key", fetchFn });
    const d = await service.dispatch("https://a.com", "mobile");
    expect(d.testId).toBe("T1");
    expect(d.jsonUrl).toContain("T1");
  });

  it("lança WebPageTestAuthError em 401", async () => {
    const service = new WebPageTestService({
      apiKey: "bad",
      fetchFn: (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ statusCode: 401 })
      } as unknown as Response)) as typeof fetch
    });
    await expect(service.dispatch("https://a.com", "mobile")).rejects.toBeInstanceOf(WebPageTestAuthError);
  });

  it("lança erro controlado sem chave", async () => {
    const service = new WebPageTestService({});
    await expect(service.dispatch("https://a.com", "mobile")).rejects.toBeInstanceOf(WebPageTestError);
  });

  it("waitForResult faz polling até concluir", async () => {
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        json: async () =>
          calls === 1
            ? { statusCode: 100 }
            : { statusCode: 200, data: { hello: "world" } }
      } as unknown as Response;
    });
    const service = new WebPageTestService({ apiKey: "k", fetchFn, pollIntervalMs: 5 });
    const data = await service.waitForResult("T1", "https://x/result", 2000);
    expect(data.hello).toBe("world");
    expect(calls).toBe(2);
  });

  it("waitForResult estoura timeout com WebPageTestTimeoutError", async () => {
    const service = new WebPageTestService({
      apiKey: "k",
      pollIntervalMs: 5,
      fetchFn: (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ statusCode: 100 })
      } as unknown as Response)) as typeof fetch
    });
    await expect(service.waitForResult("T1", "https://x/result", 50)).rejects.toBeInstanceOf(WebPageTestTimeoutError);
  });
});

describe("shouldSuggestWebPageTest", () => {
  it("sugere quando LCP/TTFB/CLS fora do limite (RF-23)", () => {
    expect(
      shouldSuggestWebPageTest({
        metrics: [
          { id: "LCP", name: "LCP", value: 4200, unit: "ms", status: "poor", displayValue: "4.2 s" }
        ],
        audits: []
      })
    ).toBe(true);
  });

  it("sugere quando há audit de alto impacto", () => {
    expect(
      shouldSuggestWebPageTest({
        metrics: [
          { id: "LCP", name: "LCP", value: 1800, unit: "ms", status: "good", displayValue: "1.8 s" }
        ],
        audits: [{ auditId: "x", title: "x", description: "x", score: 0, numericValue: 1, severity: "P1", impact: "high" }]
      })
    ).toBe(true);
  });

  it("não sugere sem problemas", () => {
    expect(
      shouldSuggestWebPageTest({
        metrics: [
          { id: "LCP", name: "LCP", value: 1800, unit: "ms", status: "good", displayValue: "1.8 s" },
          { id: "CLS", name: "CLS", value: 0.05, unit: "", status: "good", displayValue: "0.05" }
        ],
        audits: []
      })
    ).toBe(false);
  });
});