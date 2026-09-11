import { describe, expect, it, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@wpintel/prisma-test";
import { createApp } from "../src/app.js";
import { PageSpeedService } from "../src/services/pagespeed/client.js";
import { AnalysisService } from "../src/services/analysis.service.js";
import { AnalysisCache } from "../src/services/analysis-cache.js";
import { PrismaRepository } from "../src/services/repository/prisma.repository.js";
import type { AnalysisResult } from "../src/types/analysis.js";
import { psiFixture } from "./fixtures/pagespeed.fixture.js";

const client = new PrismaClient({
  datasources: { db: { url: "file:./test.db" } }
});

async function pageSpeedFixtures() {
  return new PageSpeedService({
    apiUrl: "https://api.test/pagespeed",
    fetchFn: (async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => psiFixture,
      text: async () => JSON.stringify(psiFixture)
    })) as unknown as typeof fetch
  });
}

function buildApp(repository: PrismaRepository) {
  return createApp({
    service: new AnalysisService({ pageSpeed: new PageSpeedService({
      apiUrl: "https://api.test/pagespeed",
      fetchFn: (async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => psiFixture,
        text: async () => JSON.stringify(psiFixture)
      })) as unknown as typeof fetch
    }), repository }),
    cache: new AnalysisCache<AnalysisResult>(),
    corsOrigin: "*",
    analyzeRateLimit: { windowMs: 60_000, maxRequests: 1000 },
    repository
  });
}

beforeEach(async () => {
  await client.site.deleteMany();
});

afterAll(async () => {
  await client.$disconnect();
});

describe("PrismaRepository (SQLite)", () => {
  it("cria e lista sites sem duplicar por URL", async () => {
    const repo = new PrismaRepository(client);
    const site = await repo.upsertSite({ name: "Meu Site", url: "https://meusite.com" });
    const dup = await repo.upsertSite({ name: "Meu Site", url: "https://meusite.com" });

    expect(dup.id).toBe(site.id);
    const sites = await repo.getSites();
    expect(sites).toHaveLength(1);
  });

  it("persiste análise completa com métricas e audits", async () => {
    const repo = new PrismaRepository(client);
    const site = await repo.upsertSite({ name: "x", url: "https://meusite.com" });

    const saved = await repo.createAnalysis({
      siteId: site.id,
      url: "https://meusite.com",
      finalUrl: "https://meusite.com/pt-br",
      strategy: "mobile",
      score: 67,
      analyzedAt: "2026-09-10T12:00:00Z",
      fetchTime: "2026-09-10T12:00:00Z",
      fieldData: null,
      metrics: [
        { id: "LCP", name: "Largest Contentful Paint", value: 3800, unit: "ms", status: "needs-improvement", displayValue: "3.8 s" },
        { id: "CLS", name: "Cumulative Layout Shift", value: 0.31, unit: "", status: "poor", displayValue: "0.31" }
      ],
      audits: [
        { auditId: "unsized-images", title: "Imagens sem tamanho", description: "d", score: 0, numericValue: 1, severity: "P1", impact: "high" }
      ]
    });

    const loaded = await repo.getAnalysisById(saved.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.score).toBe(67);
    expect(loaded!.finalUrl).toBe("https://meusite.com/pt-br");
    expect(loaded!.metrics).toHaveLength(2);
    expect(loaded!.audits).toHaveLength(1);
    expect(loaded!.audits[0]!.severity).toBe("P1");
    expect(loaded!.fieldData).toBeNull();
  });

  it("recupera campo fieldData quando presente", async () => {
    const repo = new PrismaRepository(client);
    const site = await repo.upsertSite({ name: "x", url: "https://others.com" });

    const saved = await repo.createAnalysis({
      siteId: site.id,
      url: "https://others.com/rota",
      finalUrl: "https://others.com/rota",
      strategy: "desktop",
      score: 80,
      analyzedAt: "2026-09-01T10:00:00Z",
      fetchTime: "2026-09-01T10:00:00Z",
      fieldData: {
        origin: "https://others.com",
        collectionPeriod: "2026-07-23",
        metrics: [
          { id: "LCP", name: "Largest Contentful Paint", value: 2100, unit: "ms", status: "needs-improvement", displayValue: "2.1 s" },
          { id: "INP", name: "Interaction to Next Paint", value: 145, unit: "ms", status: "good", displayValue: "145 ms" },
          { id: "CLS", name: "Cumulative Layout Shift", value: 0.06, unit: "", status: "good", displayValue: "0.06" },
          { id: "FCP", name: "First Contentful Paint", value: 1200, unit: "ms", status: "good", displayValue: "1.2 s" },
          { id: "TTFB", name: "Time to First Byte", value: 800, unit: "ms", status: "needs-improvement", displayValue: "0.8 s" }
        ]
      },
      metrics: [{ id: "LCP", name: "Largest Contentful Paint", value: 2100, unit: "ms", status: "needs-improvement", displayValue: "2.1 s" }],
      audits: []
    });

    const loaded = await repo.getAnalysisById(saved.id);
    expect(loaded!.fieldData).not.toBeNull();
    expect(loaded!.fieldData!.metrics.find((m) => m.id === "LCP")!.value).toBe(2100);
    expect(loaded!.fieldData!.origin).toBe("https://others.com");
  });

  it("lista análises por site com filtro de estratégia", async () => {
    const repo = new PrismaRepository(client);
    const site = await repo.upsertSite({ name: "x", url: "https://hist.com" });

    await repo.createAnalysis({
      siteId: site.id, url: "https://hist.com", finalUrl: "https://hist.com", strategy: "mobile", score: 10,
      analyzedAt: "2026-09-01T10:00:00Z", fetchTime: "2026-09-01T10:00:00Z", fieldData: null,
      metrics: [], audits: [{ auditId: "a", title: "a", description: "a", score: 0, numericValue: 1, severity: "P1", impact: "high" }]
    });
    await repo.createAnalysis({
      siteId: site.id, url: "https://hist.com", finalUrl: "https://hist.com", strategy: "mobile", score: 20,
      analyzedAt: "2026-09-02T10:00:00Z", fetchTime: "2026-09-02T10:00:00Z", fieldData: null,
      metrics: [], audits: []
    });
    await repo.createAnalysis({
      siteId: site.id, url: "https://hist.com", finalUrl: "https://hist.com", strategy: "desktop", score: 30,
      analyzedAt: "2026-09-03T10:00:00Z", fetchTime: "2026-09-03T10:00:00Z", fieldData: null,
      metrics: [], audits: []
    });

    const mobile = await repo.listAnalysesBySite(site.id, { strategy: "mobile" });
    expect(mobile).toHaveLength(2);
    expect(mobile[0]!.strategy).toBe("mobile");
    expect(mobile[0]!.failedAuditsCount).toBe(0); // newest (score 20) has no audits
    const all = await repo.listAnalysesBySite(site.id);
    expect(all).toHaveLength(3);
  });

  it("cria comparação", async () => {
    const repo = new PrismaRepository(client);
    const site = await repo.upsertSite({ name: "x", url: "https://cmp.com" });
    const a1 = await repo.createAnalysis({
      siteId: site.id, url: "https://cmp.com", finalUrl: "https://cmp.com", strategy: "mobile", score: 50,
      analyzedAt: "2026-09-01T10:00:00Z", fetchTime: "2026-09-01T10:00:00Z", fieldData: null,
      metrics: [{ id: "LCP", name: "Largest Contentful Paint", value: 3800, unit: "ms", status: "needs-improvement", displayValue: "3.8 s" }],
      audits: []
    });
    const a2 = await repo.createAnalysis({
      siteId: site.id, url: "https://cmp.com", finalUrl: "https://cmp.com", strategy: "mobile", score: 80,
      analyzedAt: "2026-09-10T10:00:00Z", fetchTime: "2026-09-10T10:00:00Z", fieldData: null,
      metrics: [{ id: "LCP", name: "Largest Contentful Paint", value: 2100, unit: "ms", status: "needs-improvement", displayValue: "2.1 s" }],
      audits: []
    });

    const comparison = await repo.createComparison({
      baselineAnalysisId: a1.id,
      currentAnalysisId: a2.id,
      result: {
        scoreBefore: 50, scoreAfter: 80, scoreDelta: 30, scorePct: 60, scoreDirection: "improved",
        metrics: []
      }
    });
    expect(comparison.id).toBeTruthy();
    expect(comparison.scoreAfter).toBe(80);
    expect(comparison.baselineAnalysisId).toBe(a1.id);
  });
});

describe("API V2 (persistência), POST /api/analyze salva e endpoints de histórico", () => {
  it("analisa, persiste e retorna siteId", async () => {
    const repo = new PrismaRepository(client);
    const app = buildApp(repo);

    const res = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "mobile" });

    expect(res.status).toBe(200);
    expect(res.body.siteId).toBeTruthy();
    expect(res.body.site.url).toBe("https://meusite.com");
    expect(res.body.id).toBeTruthy();

    const saved = await repo.getAnalysisById(res.body.id);
    expect(saved).not.toBeNull();
  });

  it("lista sites e análises por site", async () => {
    const repo = new PrismaRepository(client);
    const app = buildApp(repo);

    const analyze = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "mobile" });

    const sites = await request(app).get("/api/sites");
    expect(sites.status).toBe(200);
    expect(sites.body).toHaveLength(1);

    const siteId = sites.body[0]!.id;
    await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "desktop" });

    const history = await request(app).get(`/api/sites/${siteId}/analyses`);
    expect(history.status).toBe(200);
    expect(history.body.analyses).toHaveLength(2);
    expect(history.body.analyses[0]!.strategy).toBe("desktop"); // newest first

    const strategyFilter = await request(app).get(`/api/sites/${siteId}/analyses?strategy=mobile`);
    expect(strategyFilter.body.analyses).toHaveLength(1);
    expect(strategyFilter.body.analyses[0]!.strategy).toBe("mobile");
  });

  it("recupera análise completa por ID", async () => {
    const repo = new PrismaRepository(client);
    const app = buildApp(repo);

    const analyze = await request(app)
      .post("/api/analyze")
      .send({ url: "https://meusite.com", strategy: "mobile" });

    const detail = await request(app).get(`/api/analyses/${analyze.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.metrics).toBeInstanceOf(Array);
    expect(detail.body.metrics.length).toBeGreaterThanOrEqual(5);
    expect(detail.body.audits).toBeInstanceOf(Array);
  });

  it("compara duas análises (baseline x atual)", async () => {
    const repo = new PrismaRepository(client);
    const app = buildApp(repo);

    const first = await request(app).post("/api/analyze").send({ url: "https://cmp2.com", strategy: "mobile" });
    const second = await request(app).post("/api/analyze").send({ url: "https://cmp2.com/sobre", strategy: "mobile" });
    expect(second.body.id).not.toBe(first.body.id);

    // Rewrite second's score to simulate an improvement
    await client.analysis.update({
      where: { id: second.body.id },
      data: { score: 90 }
    });

    const compareRes = await request(app)
      .post(`/api/analyses/${second.body.id}/compare`)
      .send({ baselineAnalysisId: first.body.id });

    expect(compareRes.status).toBe(201);
    expect(compareRes.body.scoreBefore).toBe(67);
    expect(compareRes.body.scoreAfter).toBe(90);
    expect(compareRes.body.scoreDirection).toBe("improved");
    expect(compareRes.body.metrics.length).toBeGreaterThan(0);
  });

  it("gera relatório HTML", async () => {
    const repo = new PrismaRepository(client);
    const app = buildApp(repo);

    const analyze = await request(app).post("/api/analyze").send({ url: "https://meusite.com", strategy: "mobile" });

    const report = await request(app).post(`/api/reports/${analyze.body.id}`).send({});
    expect(report.status).toBe(200);
    expect(report.headers["content-type"]).toMatch(/text\/html/);
    expect(report.text).toContain("Core Web Vitals");
    expect(report.text).toContain("Resumo executivo");
    expect(report.text).toContain("Problemas prioritários");
  });

  it("retorna 404 para análise inexistente", async () => {
    const repo = new PrismaRepository(client);
    const app = buildApp(repo);
    const res = await request(app).get("/api/analyses/inexistente");
    expect(res.status).toBe(404);
  });
});