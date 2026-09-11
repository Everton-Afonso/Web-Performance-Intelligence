import type { Request, Response } from "express";
import type { Repository } from "../types/storage.js";
import type { MonitoringScheduler } from "../services/monitoring/scheduler.js";
import { createMonitorSchema } from "../validators/monitoring.schema.js";

export class MonitoringController {
  constructor(
    private readonly repository: Repository,
    private readonly scheduler?: MonitoringScheduler
  ) {}

  async list(_req: Request, res: Response): Promise<void> {
    const monitors = await this.repository.listMonitors();
    res.json(monitors);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createMonitorSchema.parse(req.body);
    const site = await this.repository.getSiteById(input.siteId);
    if (!site) {
      res.status(404).json({ error: "Site não encontrado." });
      return;
    }
    const monitor = await this.repository.createMonitor({
      siteId: site.id,
      strategy: input.strategy,
      intervalHours: input.intervalHours
    });
    res.status(201).json(monitor);
  }

  async toggle(req: Request, res: Response): Promise<void> {
    const monitor = await this.repository.getMonitorById(req.params.id!);
    if (!monitor) {
      res.status(404).json({ error: "Monitor não encontrado." });
      return;
    }
    const updated = await this.repository.updateMonitor(monitor.id, {
      enabled: !monitor.enabled
    });
    res.json(updated);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const monitor = await this.repository.getMonitorById(req.params.id!);
    if (!monitor) {
      res.status(404).json({ error: "Monitor não encontrado." });
      return;
    }
    await this.repository.deleteMonitor(monitor.id);
    res.status(204).end();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async runNow(req: Request, res: Response): Promise<void> {
    if (!this.scheduler) {
      res.status(503).json({ error: "Monitoramento não habilitado." });
      return;
    }
    const monitor = await this.repository.getMonitorById(req.params.id!);
    if (!monitor) {
      res.status(404).json({ error: "Monitor não encontrado." });
      return;
    }
    const result = await this.scheduler.runMonitor(monitor);
    if (result.error) {
      res.status(502).json({ error: result.error });
      return;
    }
    res.json({ analysisId: result.analysisId, alertsCreated: result.alertsCreated });
  }
}