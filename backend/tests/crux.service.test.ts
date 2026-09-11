import { describe, expect, it, vi } from "vitest";
import { CruxService, parseCruxRecord } from "../src/services/crux/crux.service.js";

const cruxPayload = {
  record: {
    key: { origin: "https://example.com" },
    collectionPeriod: {
      firstDay: { year: 2026, month: 6, day: 26 },
      lastDay: { year: 2026, month: 7, day: 23 }
    },
    metrics: {
      interaction_to_next_paint: { percentiles: { p75: 145 } },
      largest_contentful_paint: { percentiles: { p75: 2100 } },
      cumulative_layout_shift: { percentiles: { p75: 0.06 } },
      first_contentful_paint: { percentiles: { p75: 1200 } },
      experimental_time_to_first_byte: { percentiles: { p75: 800 } }
    }
  }
};

const noFieldDataPayload = { error: { code: 404, status: "NOT_FOUND" } };

describe("parseCruxRecord", () => {
  it("extrai p75 das métricas de campo", () => {
    const field = parseCruxRecord(cruxPayload);
    expect(field).not.toBeNull();
    const byId = Object.fromEntries(field!.metrics.map((m) => [m.id, m]));
    expect(byId["LCP"]!.value).toBe(2100);
    expect(byId["INP"]!.value).toBe(145);
    expect(byId["CLS"]!.value).toBe(0.06);
    expect(byId["TTFB"]!.value).toBe(800);
    expect(field!.origin).toBe("https://example.com");
  });

  it("classifica métricas (field) com os mesmos limites", () => {
    const field = parseCruxRecord(cruxPayload)!;
    const lcp = field.metrics.find((m) => m.id === "LCP")!;
    const cls = field.metrics.find((m) => m.id === "CLS")!;
    expect(lcp.status).toBe("good"); // 2.1 s <= 2.5 s
    expect(cls.status).toBe("good");
  });

  it("formata display values consistentes", () => {
    const field = parseCruxRecord(cruxPayload)!;
    const flashLcp = field.metrics.find((m) => m.id === "LCP")!;
    expect(flashLcp.displayValue).toBe("2.1 s");
    const inp = field.metrics.find((m) => m.id === "INP")!;
    expect(inp.displayValue).toBe("145 ms");
  });

  it("retorna null quando não houver dados (404)", () => {
    expect(parseCruxRecord(noFieldDataPayload)).toBeNull();
  });

  it("retorna null para payload sem record", () => {
    expect(parseCruxRecord({})).toBeNull();
    expect(parseCruxRecord(null)).toBeNull();
  });
});

describe("CruxService", () => {
  it("não chama a API sem chave", async () => {
    const fetchFn = vi.fn();
    const service = new CruxService({ apiUrl: "https://api.test/crux", fetchFn });
    const result = await service.fetchFieldData("https://example.com");
    expect(result).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("envia origin apenas e retorna dados", async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { origin?: string };
      expect(body.origin).toBe("https://example.com");
      return {
        ok: true,
        status: 200,
        json: async () => cruxPayload,
        text: async () => JSON.stringify(cruxPayload)
      } as unknown as Response;
    });

    const service = new CruxService({ apiUrl: "https://api.test/crux", apiKey: "key", fetchFn });
    const result = await service.fetchFieldData("https://example.com/pagina?x=1");

    expect(result).not.toBeNull();
    expect(result!.origin).toBe("https://example.com");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retorna null em resposta não-ok (origem sem dados)", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => ""
    }) as unknown as Response);

    const service = new CruxService({ apiUrl: "https://api.test/crux", apiKey: "key", fetchFn });
    expect(await service.fetchFieldData("https://example.com")).toBeNull();
  });

  it("retorna null quando a rede falha", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network");
    });
    const service = new CruxService({ apiUrl: "https://api.test/crux", apiKey: "key", fetchFn });
    expect(await service.fetchFieldData("https://example.com")).toBeNull();
  });
});