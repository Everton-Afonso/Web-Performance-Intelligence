import type { Request, Response } from "express";
import type { Repository } from "../types/storage.js";
import { createSiteSchema } from "../validators/site.schema.js";

export class SitesController {
  constructor(private readonly repository: Repository) {}

  async listSites(_req: Request, res: Response): Promise<void> {
    const sites = await this.repository.getSites();
    res.json(sites);
  }

  async createSite(req: Request, res: Response): Promise<void> {
    const input = createSiteSchema.parse(req.body);
    if (input.projectId) {
      const project = await this.repository.getProjectById(input.projectId);
      if (!project) {
        res.status(404).json({ error: "Projeto não encontrado." });
        return;
      }
    }
    const site = await this.repository.upsertSite({
      name: input.name,
      url: input.url,
      projectId: input.projectId ?? null
    });
    res.status(201).json(site);
  }

  async getSite(req: Request, res: Response): Promise<void> {
    const site = await this.repository.getSiteById(req.params.id!);
    if (!site) {
      res.status(404).json({ error: "Site não encontrado." });
      return;
    }
    res.json(site);
  }

  async getSiteAnalyses(req: Request, res: Response): Promise<void> {
    const site = await this.repository.getSiteById(req.params.id!);
    if (!site) {
      res.status(404).json({ error: "Site não encontrado." });
      return;
    }
    const { strategy, from, to, limit } = req.query as Record<string, string | undefined>;
    const analyses = await this.repository.listAnalysesBySite(site.id, {
      strategy: strategy as "mobile" | "desktop" | undefined,
      from,
      to,
      limit: limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : undefined
    });
    res.json({ site, analyses });
  }

  async getAnalysis(req: Request, res: Response): Promise<void> {
    const analysis = await this.repository.getAnalysisById(req.params.id!);
    if (!analysis) {
      res.status(404).json({ error: "Análise não encontrada." });
      return;
    }
    res.json(analysis);
  }
}