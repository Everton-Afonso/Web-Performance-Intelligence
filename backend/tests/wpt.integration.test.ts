import { describe, expect, it, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@wpintel/prisma-test";
import { createApp } from "../src/app.js";
import { PageSpeedService } from "../src/services/pagespeed/client.js";
import { WebPageTestService } from "../src/services/webpagetest/client.js";
import { AnalysisService } from "../src/services/analysis.service.js";
import { AnalysisCache } from "../src/services/analysis-cache.js";
import { PrismaRepository } from "../src/services/repository/prisma.repository.js";
import type { AnalysisResult } from "../src/types/analysis.js";
import { psiFixture } from "./fixtures/pagespeed.fixture.js";

const client = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });

const wptOk = {
  statusCode: 200,
  data: {
    testInfo: { location: "Dulles_Chrome", browser: "Chrome" },
    runs: {
      "1": {
        firstView: {
          bytesIn: 900_000,
          requestsCount: 30,
          TTFB: 250,
          FCP: 900,
          LCP: 1800,
          CLS: 0.02,
          requests: [{ url: "https://cdn.x.com/app.js", host: "cdn.x.com", contentType: "script", startTime: 10, loadTime: 500, bytesIn: 120_000 }]
        }
      }
    }
  }
};

function buildContext() {
  const repository = new PrismaRepository(client);
  const pageSpeed = new PageSpeedService({
    apiUrl: "https://api.test/pagespeed",
    fetchFn: (async () => ({
      ok: true,
      status: 200,
      json: async () => psiFixture,
      text: async () => JSON.stringify(psiFixture)
    })) as unknown as typeof fetch
  });
  let pollCalls = 0;
  const webPageTest = new WebPageTestService({
    apiKey: "pro-key",
    apiUrl: "https://wpt.test",
    fetchFn: (async (u: string | URL | Request) => {
      const isDispatch = String(u).includes("runtest.php");
      if (isDispatch) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ statusCode: 200, data: { testId: "WPT-1", jsonUrl: "https://wpt.test/jsonResult.php?test=WPT-1" } }),
          text: async () => ""
        } as unknown as Response;
      }
      pollCalls += 1;
      return {
        ok: true,
        status: 200,
        json: async () => (pollCalls >= 2 ? wptOk : { statusCode: 100 }),
        text: async () => ""
      } as unknown as Response;
    }) as unknown as typeof fetch,
    pollIntervalMs: 5
  });

  const service = new AnalysisService({ pageSpeed, repository, webPageTest });
  const app = createApp({
    service,
    cache: new AnalysisCache<AnalysisResult>(),
    corsOrigin: "*",
    analyzeRateLimit: { windowMs: 60_000, maxRequests: 1000 },
    repository,
    webPageTest
  });
  return { app, repository };
}

let siteCreated = false;

beforeEach(async () => {
  if (!siteCreated) {
    // DB is shared across tests; cleanup handled inside each test block
  }
  await client.site.deleteMany();
  await client.analysis.deleteMany();
});

afterAll(async () => {
  await client.$disconnect();
});

describe("WebPageTest (V1.1)", () => {
  it("analyze com deep=true retorna needsWebPageTest e dispatch pending", async () => {
    const { app } = buildContext();
    const res = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "mobile", deep: true });
    expect(res.status).toBe(200);
    // fixture tem LCP needs-improvement -> sugere investigation
    expect(res.body.needsWebPageTest).toBe(true);
    expect(res.body.webPageTest).toBeDefined();
    expect(res.body.webPageTest.status).toBe("pending");
    expect(res.body.webPageTest.testId).toBe("WPT-1");
  });

  it("POST /api/analyses/:id/webpagetest e GET retornam resultado consolidado", async () => {
    const { app } = buildContext();

    const analyze = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "mobile" });
    const analysisId = analyze.body.id as string;
    expect(analyze.body.needsWebPageTest).toBe(true);

    const run = await request(app).post(`/api/analyses/${analysisId}/webpagetest`);
    expect(run.status).toBe(202);
    expect(run.body.webPageTest.testId).toBe("WPT-1");
    expect(run.body.webPageTest.status).toBe("pending");

    const poll = await request(app).get(`/api/analyses/${analysisId}/webpagetest`);
    expect(poll.status).toBe(200);
    expect(poll.body.webPageTest.status).toBe("completed");
    expect(poll.body.webPageTest.metrics.length).toBeGreaterThan(0);
    expect(poll.body.webPageTest.requests).toBe(30);

    // persistência
    const fromRepo = await new PrismaRepository(client).getWebPageTestByAnalysis(analysisId);
    expect(fromRepo).not.toBeNull();
    expect(fromRepo!.topRequests.length).toBeGreaterThan(0);
  });

  it("retorna 503 quando WebPageTest desabilitado (sem chave)", async () => {
    const repository = new PrismaRepository(client);
    const pageSpeed = new PageSpeedService({
      apiUrl: "https://api.test",
      fetchFn: (async () => ({
        ok: true,
        status: 200,
        json: async () => psiFixture,
        text: async () => JSON.stringify(psiFixture)
      })) as unknown as typeof fetch
    });
    const service = new AnalysisService({ pageSpeed, repository });
    const app = createApp({
      service,
      cache: new AnalysisCache<AnalysisResult>(),
      corsOrigin: "*",
      analyzeRateLimit: { windowMs: 60_000, maxRequests: 1000 },
      repository
    });

    const analyze = await request(app).post("/api/analyze").send({ url: "https://meusite.com", strategy: "mobile" });
    const res = await request(app).post(`/api/analyses/${analyze.body.id}/webpagetest`);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/WEBPAGETEST_API_KEY/i);
  });
});