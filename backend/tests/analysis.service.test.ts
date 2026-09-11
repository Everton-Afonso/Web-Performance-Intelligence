import { describe, expect, it } from "vitest";
import {
  PageSpeedClientError,
  PageSpeedService
} from "../src/services/pagespeed/client.js";
import { AnalysisService, PageSpeedRequestError } from "../src/services/analysis.service.js";
import { InvalidUrlError } from "../src/validators/url.validator.js";
import { psiErrorFixture, psiFailDocumentFixture, psiFixture } from "./fixtures/pagespeed.fixture.js";

function serviceReturning(payload: unknown) {
  const fetchFn = async (
    _url: string | URL | Request,
    _init?: RequestInit
  ): Promise<Response> =>
    ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
      text: async () => JSON.stringify(payload)
    }) as unknown as Response;

  const pageSpeed = new PageSpeedService({
    apiUrl: "https://api.test/pagespeed",
    fetchFn: fetchFn as unknown as typeof fetch
  });
  return new AnalysisService(pageSpeed);
}

describe("AnalysisService", () => {
  it("executa análise completa de ponta a ponta", async () => {
    const service = serviceReturning(psiFixture);
    const result = await service.analyze({ url: "https://meusite.com", strategy: "mobile" });

    expect(result.performanceScore).toBe(67);
    expect(result.requestedUrl).toBe("https://meusite.com");
    expect(result.finalUrl).toBe("https://meusite.com/pt-br");
    expect(result.strategy).toBe("mobile");

    const metricsById = Object.fromEntries(result.metrics.map((m) => [m.id, m]));
    expect(metricsById["performance-score"]!.value).toBe(67);
    expect(metricsById["LCP"]!.status).toBe("needs-improvement");
    expect(metricsById["INP"]!.status).toBe("good");
    expect(metricsById["CLS"]!.status).toBe("poor");
    expect(metricsById["FCP"]!.status).toBe("needs-improvement");
    expect(metricsById["TTFB"]!.status).toBe("needs-improvement");

    expect(result.failedAuditsCount).toBeGreaterThanOrEqual(5);
    expect(result.highImpactCount).toBeGreaterThanOrEqual(2);
    expect(result.audits[0]!.severity).toBe("P0");

    expect(result.analyzedAt).toBe("2026-09-10T12:00:00.000Z");
  });

  it("valida a URL antes de chamar o serviço externo (RF-11 / RNF-04 / CA-02)", async () => {
    const service = serviceReturning(psiFixture);
    await expect(
      service.analyze({ url: "não é url", strategy: "mobile" })
    ).rejects.toBeInstanceOf(InvalidUrlError);
  });

  it("converte erro da API em erro controlado (RF-18 / RNF-06)", async () => {
    const service = serviceReturning(psiErrorFixture);
    await expect(
      service.analyze({ url: "https://meusite.com", strategy: "mobile" })
    ).rejects.toMatchObject({ name: "PageSpeedRequestError", status: 502 });
  });

  it("mapeia FAILED_DOCUMENT_REQUEST para mensagem compreensível (CA-07)", async () => {
    const service = serviceReturning(psiFailDocumentFixture);
    await expect(
      service.analyze({ url: "https://inacessivel.com", strategy: "mobile" })
    ).rejects.toThrow(/não foi possível acessar|acessar a página/i);
  });

  it("aceita apenas estratégias mobile ou desktop (RF-02 / CA-03)", async () => {
    const service = serviceReturning(psiFixture);
    const desktop = await service.analyze({
      url: "https://meusite.com",
      strategy: "desktop" as never
    });
    expect(desktop.strategy).toBe("desktop");

    const fallback = await service.analyze({
      url: "https://meusite.com",
      strategy: "tablet" as never
    });
    expect(fallback.strategy).toBe("mobile");
  });

  it("reporta métrica INP como não disponível quando ausente no payload", async () => {
    const payload = structuredClone(psiFixture);
    if (payload?.lighthouseResult?.audits) {
      delete payload.lighthouseResult.audits["interaction-to-next-paint"];
      const metrics = payload.lighthouseResult.audits["metrics"] = {
        id: "metrics",
        title: "Metrics",
        description: "",
        score: null,
        scoreDisplayMode: "notApplicable",
        details: { items: [{}] }
      };
      void metrics;
    }

    const service = serviceReturning(payload);
    const result = await service.analyze({ url: "https://meusite.com", strategy: "mobile" });
    const inp = result.metrics.find((m) => m.id === "INP");
    expect(inp?.value).toBeNull();
    expect(inp?.displayValue).toBe("Não disponível");
  });

  it("propaga falha de rede como erro controlado (RNF-06)", async () => {
    const pageSpeed = new PageSpeedService({
      apiUrl: "https://api.test/pagespeed",
      fetchFn: (() => {
        throw new Error("network down");
      }) as unknown as typeof fetch
    });
    const service = new AnalysisService(pageSpeed);
    await expect(
      service.analyze({ url: "https://meusite.com", strategy: "mobile" })
    ).rejects.toBeInstanceOf(PageSpeedClientError);
  });
});