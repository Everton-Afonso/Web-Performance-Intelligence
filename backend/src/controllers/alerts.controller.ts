import type { Request, Response } from "express";
import type { Repository } from "../types/storage.js";

export class AlertsController {
  constructor(private readonly repository: Repository) {}

  async list(req: Request, res: Response): Promise<void> {
    const { siteId, unread } = req.query as Record<string, string | undefined>;
    const alerts = await this.repository.listAlerts({
      siteId,
      unreadOnly: unread === "true",
      limit: 100
    });
    res.json(alerts);
  }

  async count(_req: Request, res: Response): Promise<void> {
    const unread = await this.repository.unreadAlertsCount();
    res.json({ unread });
  }

  async markRead(req: Request, res: Response): Promise<void> {
    const alert = await this.repository.markAlertRead(req.params.id!);
    if (!alert) {
      res.status(404).json({ error: "Alerta não encontrado." });
      return;
    }
    res.json(alert);
  }
}