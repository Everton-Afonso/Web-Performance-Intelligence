import type { Request, Response } from "express";
import type { Repository } from "../types/storage.js";
import { createGoalSchema } from "../validators/monitoring.schema.js";

export class GoalsController {
  constructor(private readonly repository: Repository) {}

  async listBySite(req: Request, res: Response): Promise<void> {
    const site = await this.repository.getSiteById(req.params.siteId!);
    if (!site) {
      res.status(404).json({ error: "Site não encontrado." });
      return;
    }
    const goals = await this.repository.listGoalsBySite(site.id);
    res.json(goals);
  }

  async upsert(req: Request, res: Response): Promise<void> {
    const input = createGoalSchema.parse(req.body);
    const site = await this.repository.getSiteById(input.siteId);
    if (!site) {
      res.status(404).json({ error: "Site não encontrado." });
      return;
    }
    const goal = await this.repository.upsertGoal(input);
    res.status(201).json(goal);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const site = await this.repository.getSiteById(req.params.siteId!);
    if (!site) {
      res.status(404).json({ error: "Site não encontrado." });
      return;
    }
    await this.repository.deleteGoal(req.params.goalId!);
    res.status(204).end();
  }
}