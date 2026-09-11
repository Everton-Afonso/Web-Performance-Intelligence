import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { PageSpeedService } from "../src/services/pagespeed/client.js";
import { AnalysisService } from "../src/services/analysis.service.js";
import { AnalysisCache } from "../src/services/analysis-cache.js";
import type { AnalysisResult } from "../src/types/analysis.js";
import { psiErrorFixture, psiFixture } from "./fixtures/pagespeed.fixture.js";

function buildServer(payload: unknown = psiFixture, failureMode: "http" | "badrequest" | null = null) {
  let requestCount = 0;
  const fetchFn = async (
    _url: string | URL | Request,
    _init?: RequestInit
  ): Promise<Response> => {
    requestCount += 1;
    if (failureMode === "http") {
      return {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "backend down",
        json: async () => ({})
      } as unknown as Response;
    }
    if (failureMode === "badrequest") {
      return {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () =>
          JSON.stringify({
            error: {
              code: 400,
              status: "FAILED_DOCUMENT_REQUEST",
              message: "Lighthouse returned an error"
            }
          }),
        json: async () => ({})
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
      text: async () => JSON.stringify(payload)
    } as unknown as Response;
  };

  const pageSpeed = new PageSpeedService({
    apiUrl: "https://api.test/pagespeed",
    fetchFn: fetchFn as unknown as typeof fetch
  });
  const service = new AnalysisService(pageSpeed);
  const cache = new AnalysisCache<AnalysisResult>({ ttlMs: 60_000 });

  const app = createApp({
    service,
    cache,
    corsOrigin: "*",
    analyzeRateLimit: { windowMs: 60_000, maxRequests: 1000 }
  });

  return { app, cache, getRequestCount: () => requestCount };
}

describe("GET /api/health (RF-10)", () => {
  it("retorna status ok com uptime e versão", async () => {
    const { app } = buildServer();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.version).toBe("1.0.0");
    expect(typeof res.body.uptimeSec).toBe("number");
  });
});

describe("POST /api/analyze", () => {
  it("analisa URL válida e retorna resultado completo (CA-01 / CA-04)", async () => {
    const { app } = buildServer();
    const res = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "mobile" });

    expect(res.status).toBe(200);
    expect(res.body.performanceScore).toBe(67);
    expect(res.body.finalUrl).toBe("https://meusite.com/pt-br");
    expect(res.body.strategy).toBe("mobile");
    expect(res.body.metrics).toBeInstanceOf(Array);
    expect(res.body.audits).toBeInstanceOf(Array);
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("rejeita URL inválida sem chamada externa (CA-02)", async () => {
    const { app, getRequestCount } = buildServer();
    const before = getRequestCount();
    const res = await request(app)
      .post("/api/analyze")
      .send({ url: "invalida.com", strategy: "mobile" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/http|https/);
    expect(getRequestCount()).toBe(before);
  });

  it("rejeita corpo sem URL", async () => {
    const { app } = buildServer();
    const res = await request(app).post("/api/analyze").send({ strategy: "mobile" });
    expect(res.status).toBe(400);
  });

  it("usa mobile como estratégia padrão (RF-02)", async () => {
    const { app } = buildServer();
    const res = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com" });

    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe("mobile");
  });

  it("usa cache para evitar análises duplicadas (RNF-14)", async () => {
    const { app, getRequestCount } = buildServer();
    const first = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "desktop" });
    expect(first.status).toBe(200);

    const callsAfterFirst = getRequestCount();
    const second = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "desktop" });
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(getRequestCount()).toBe(callsAfterFirst);
  });

  it("converte falha HTTP da API externa em erro 502 controlado (RF-18 / RNF-06)", async () => {
    const { app } = buildServer(psiFixture, "http");
    const res = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "mobile" });
    expect(res.status).toBe(502);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error).not.toContain("api.test");
    expect(res.body.error).toMatch(/indisponível|temporariamente/i);
  });

  it("explica quando a página não pôde ser analisada (CA-07)", async () => {
    const { app } = buildServer(psiFixture, "badrequest");
    const res = await request(app)
      .post("/api/analyze")
      .send({ url: "https://www.google.com", strategy: "mobile"});
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/acessar a página|rastreadores/i);
  });

  it("converte erro em payload PSI em erro 502 com mensagem compreensível (CA-07)", async () => {
    const { app } = buildServer(psiErrorFixture);
    const res = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "mobile" });
    expect(res.status).toBe(502);
    expect(res.body.error).toBeTruthy();
  });

  it("aplica rate limiting (seção 12.1)", async () => {
    const pageSpeed = new PageSpeedService({
      apiUrl: "https://api.test",
      fetchFn: (async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => psiFixture,
        text: async () => JSON.stringify(psiFixture)
      })) as unknown as typeof fetch
    });
    const service = new AnalysisService(pageSpeed);
    const cache = new AnalysisCache<AnalysisResult>();
    const limited = createApp({
      service,
      cache,
      corsOrigin: "*",
      analyzeRateLimit: { windowMs: 60_000, maxRequests: 2 }
    });

    for (let i = 0; i < 2; i++) {
      const res = await request(limited)
        .post("/api/analyze")
        .send({ url: `https://meusite.com/${i}`, strategy: "mobile" });
      expect(res.status).toBe(200);
    }

    const blocked = await request(limited)
      .post("/api/analyze")
      .send({ url: "https://meusite.com/bloqueada", strategy: "mobile" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeTruthy();
  });
});

describe("rotas desconhecidas", () => {
  it("retorna 404 para rota inexistente", async () => {
    const { app } = buildServer();
    const res = await request(app).get("/api/nao-existe");
    expect(res.status).toBe(404);
  });
});