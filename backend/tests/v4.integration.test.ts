import { describe, expect, it, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@wpintel/prisma-test";
import { createApp } from "../src/app.js";
import { PageSpeedService } from "../src/services/pagespeed/client.js";
import { AnalysisService } from "../src/services/analysis.service.js";
import { AnalysisCache } from "../src/services/analysis-cache.js";
import { PrismaRepository } from "../src/services/repository/prisma.repository.js";
import { MonitoringScheduler } from "../src/services/monitoring/scheduler.js";
import type { AnalysisResult } from "../src/types/analysis.js";
import { psiFixture } from "./fixtures/pagespeed.fixture.js";

const client = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });

function pageSpeedWith(status: number) {
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

function buildContext() {
  const repository = new PrismaRepository(client);
  const now = () => new Date("2026-09-15T12:00:00Z");
  const service = new AnalysisService({ pageSpeed: pageSpeedWith(200), repository });
  const scheduler = new MonitoringScheduler({ repository, analyzer: service, now });
  const app = createApp({
    service,
    cache: new AnalysisCache<AnalysisResult>(),
    corsOrigin: "*",
    analyzeRateLimit: { windowMs: 60_000, maxRequests: 1000 },
    repository,
    scheduler
  });
  return { app, repository, scheduler };
}

async function createSite(url = "https://mon.com") {
  const repo = new PrismaRepository(client);
  return repo.upsertSite({ name: "Monitorado", url });
}

beforeEach(async () => {
  await client.project.deleteMany();
  await client.site.deleteMany();
});

afterAll(async () => {
  await client.$disconnect();
});

describe("V4 — Projects", () => {
  it("cria, lista e retorna projeto com sites", async () => {
    const { app } = buildContext();

    const created = await request(app)
      .post("/api/projects")
      .send({ name: "Loja virtual" });
    expect(created.status).toBe(201);

    const site = await request(app)
      .post("/api/sites")
      .send({ name: "Loja", url: "https://loja.com", projectId: created.body.id });
    expect(site.status).toBe(201);
    expect(site.body.projectId).toBe(created.body.id);

    const list = await request(app).get("/api/projects");
    expect(list.body).toHaveLength(1);

    const detail = await request(app).get(`/api/projects/${created.body.id}`);
    expect(detail.body.sites).toHaveLength(1);
    expect(detail.body.sites[0]!.url).toBe("https://loja.com");
  });

  it("rejeita criar site com projeto inexistente", async () => {
    const { app } = buildContext();
    const res = await request(app)
      .post("/api/sites")
      .send({ name: "x", url: "https://x.com", projectId: "nao-existe" });
    expect(res.status).toBe(404);
  });
});

describe("V4 — Monitoring", () => {
  it("cria monitor, lista, alterna e executa run", async () => {
    const site = await createSite();
    const { app, repository } = buildContext();

    const created = await request(app)
      .post("/api/monitoring")
      .send({ siteId: site.id, strategy: "mobile", intervalHours: 4 });
    expect(created.status).toBe(201);
    expect(created.body.nextRunAt).toBeTruthy();

    const list = await request(app).get("/api/monitoring");
    expect(list.body).toHaveLength(1);

    // toggle -> desabilitado
    const toggled = await request(app).post(`/api/monitoring/${created.body.id}/toggle`);
    expect(toggled.body.enabled).toBe(false);

    // resume + run now
    await request(app).post(`/api/monitoring/${created.body.id}/toggle`);
    const run = await request(app).post(`/api/monitoring/${created.body.id}/run`);
    expect(run.status).toBe(200);
    expect(run.body.analysisId).toBeTruthy();

    const monitors = await repository.listMonitors();
    expect(monitors[0]!.lastRunAt).toBeTruthy();
    expect(monitors[0]!.nextRunAt).toBe("2026-09-15T16:00:00.000Z");

    // delete
    const del = await request(app).delete(`/api/monitoring/${created.body.id}`);
    expect(del.status).toBe(204);
    const after = await request(app).get("/api/monitoring");
    expect(after.body).toHaveLength(0);
  });

  it("scheduler.runMonitor persiste análise e detecta regressão vs anterior", async () => {
    const repository = new PrismaRepository(client);
    const now = () => new Date("2026-09-15T12:00:00Z");
    const service = new AnalysisService({ pageSpeed: pageSpeedWith(200), repository });
    const scheduler = new MonitoringScheduler({ repository, analyzer: service, now });

    const site = await repository.upsertSite({ name: "m", url: "https://mon.com" });
    // baseline com score alto (fixture base é 67; simulamos uma anterior melhor em 90)
    await repository.createAnalysis({
      siteId: site.id, url: "https://mon.com", finalUrl: "https://mon.com", strategy: "mobile", score: 90,
      analyzedAt: "2026-09-14T12:00:00Z", fetchTime: "2026-09-14T12:00:00Z", fieldData: null,
      metrics: [
        { id: "performance-score", name: "Performance Score", value: 90, unit: "score", status: "good", displayValue: "90" },
        { id: "LCP", name: "LCP", value: 2000, unit: "ms", status: "good", displayValue: "2.0 s" }
      ],
      audits: [],
      recommendations: []
    });

    const monitor = await repository.createMonitor({ siteId: site.id, strategy: "mobile", intervalHours: 4 });
    await scheduler.runMonitor(monitor);

    const analyses = await repository.listAnalysesBySite(site.id);
    expect(analyses.length).toBeGreaterThanOrEqual(2);

    const alerts = await repository.listAlerts();
    // fixture atual tem LCP poor/needs e CLS good; comparar com baseline 90/good -> regressão esperada
    expect(alerts.length).toBeGreaterThan(0);
    expect(["regression", "goal"]).toContain(alerts[0]!.type);
  });

  it("monitor com meta não cumprida gera alerta de goal", async () => {
    const repository = new PrismaRepository(client);
    const now = () => new Date("2026-09-15T12:00:00Z");
    const service = new AnalysisService({ pageSpeed: pageSpeedWith(200), repository });
    const scheduler = new MonitoringScheduler({ repository, analyzer: service, now });

    const site = await repository.upsertSite({ name: "meta", url: "https://meta.com" });
    await repository.upsertGoal({
      siteId: site.id,
      metric: "LCP",
      target: 2500,
      operator: "lte"
    });
    const monitor = await repository.createMonitor({ siteId: site.id, strategy: "mobile", intervalHours: 2 });
    await scheduler.runMonitor(monitor);

    const alerts = await repository.listAlerts({ siteId: site.id });
    // fixture LCP lab é ~7s -> meta não cumprida
    expect(alerts.some((a) => a.type === "goal")).toBe(true);
  });
});

describe("V4 — Alerts & Goals endpoints", () => {
  it("lista, marca lido e conta alertas não lidos", async () => {
    const repository = new PrismaRepository(client);
    const { app } = buildContext();
    const site = await repository.upsertSite({ name: "a", url: "https://alerts.com" });

    await repository.createAlert({
      siteId: site.id,
      type: "regression",
      metric: "LCP",
      severity: "high",
      message: "LCP regrediu",
      analysisId: null
    });
    await repository.createAlert({
      siteId: site.id,
      type: "goal",
      metric: "CLS",
      severity: "medium",
      message: "CLS fora da meta",
      analysisId: null
    });

    const list = await request(app).get("/api/alerts");
    expect(list.body).toHaveLength(2);

    const count = await request(app).get("/api/alerts/count");
    expect(count.body.unread).toBe(2);

    const first = list.body[0] as { id: string };
    const read = await request(app).post(`/api/alerts/${first.id}/read`);
    expect(read.body.read).toBe(true);

    const countAfter = await request(app).get("/api/alerts/count");
    expect(countAfter.body.unread).toBe(1);
  });

  it("cria e remove meta de site", async () => {
    const repository = new PrismaRepository(client);
    const { app } = buildContext();
    const site = await repository.upsertSite({ name: "meta", url: "https://g.com" });

    const created = await request(app)
      .post("/api/goals")
      .send({ siteId: site.id, metric: "CLS", target: 0.1, operator: "lte" });
    expect(created.status).toBe(201);

    const list = await request(app).get(`/api/sites/${site.id}/goals`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]!.metric).toBe("CLS");

    const del = await request(app).delete(`/api/sites/${site.id}/goals/${created.body.id}`);
    expect(del.status).toBe(204);
  });
});