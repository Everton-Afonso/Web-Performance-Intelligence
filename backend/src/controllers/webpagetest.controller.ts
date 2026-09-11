import type { Request, Response } from "express";
import type { Repository } from "../types/storage.js";
import type { WebPageTestService } from "../services/webpagetest/client.js";
import { parseWebPageTestResult } from "../services/webpagetest/parser.js";

export class WebPageTestController {
  constructor(
    private readonly repository: Repository,
    private readonly service?: WebPageTestService
  ) {}

  private assertEnabled(res: Response): WebPageTestService | null {
    if (!this.service || !this.service.isEnabled()) {
      res.status(503).json({
        error:
          "WebPageTest não habilitado. Configure WEBPAGETEST_API_KEY no backend (a API faz parte do plano Pro)."
      });
      return null;
    }
    return this.service;
  }

  /** POST /api/analyses/:id/webpagetest — dispatch rodada profunda sob demanda (RF-20/23). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async run(req: Request, res: Response): Promise<void> {
    const service = this.assertEnabled(res);
    const analysis = await this.repository.getAnalysisById(req.params.id!);
    if (!analysis) {
      res.status(404).json({ error: "Análise não encontrada." });
      return;
    }
    if (!service) return;

    if (analysis.webPageTest?.status === "completed") {
      res.json({ analysisId: analysis.id, webPageTest: analysis.webPageTest });
      return;
    }
    if (analysis.webPageTest?.testId) {
      res.json({ analysisId: analysis.id, webPageTest: analysis.webPageTest });
      return;
    }

    try {
      const dispatch = await service.dispatch(analysis.url, analysis.strategy);
      await this.repository.attachWebPageTestDispatch(analysis.id, dispatch.testId, "pending");
      const summary = analysis.webPageTest ?? {
        testId: dispatch.testId,
        status: "pending" as const,
        metrics: [],
        requests: 0,
        bytes: 0,
        topRequests: [],
        analyzedAt: new Date().toISOString(),
        waterfallRef: dispatch.jsonUrl
      };
      res.status(202).json({ analysisId: analysis.id, webPageTest: summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: message });
    }
  }

  /** GET /api/analyses/:id/webpagetest — poll o resultado e persiste (RF-21/22). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async poll(req: Request, res: Response): Promise<void> {
    const service = this.assertEnabled(res);
    const analysis = await this.repository.getAnalysisById(req.params.id!);
    if (!analysis) {
      res.status(404).json({ error: "Análise não encontrada." });
      return;
    }
    if (!service) return;

    if (analysis.webPageTest?.status === "completed") {
      res.json({ analysisId: analysis.id, webPageTest: analysis.webPageTest });
      return;
    }
    const testId = analysis.webPageTest?.testId;
    if (!testId) {
      res.status(409).json({
        error: "Nenhum teste WebPageTest iniciado. Chame POST /api/analyses/:id/webpagetest primeiro."
      });
      return;
    }

    try {
      const raw = await service.waitForResult(testId, undefined, 120_000);
      const summary = parseWebPageTestResult(raw, testId, analysis.url);
      await this.repository.saveWebPageTestResult(analysis.id, summary);
      const updated = await this.repository.getAnalysisById(analysis.id);
      res.json({ analysisId: analysis.id, webPageTest: updated?.webPageTest ?? summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(408).json({ error: message, webPageTest: { testId, status: "timeout" } });
    }
  }
}