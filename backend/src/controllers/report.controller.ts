import type { Request, Response } from "express";
import { z } from "zod";
import type { Repository } from "../types/storage.js";
import { generateReportHtml } from "../services/reports/report.service.js";
import { buildComparison } from "../services/performance/comparison.js";

const reportSchema = z.object({
  baselineAnalysisId: z.string().min(1).optional()
});

export class ReportController {
  constructor(private readonly repository: Repository) {}

  async generate(req: Request, res: Response): Promise<void> {
    const { baselineAnalysisId } = reportSchema.parse(req.body);
    const analysisId = req.params.id!;

    const analysis = await this.repository.getAnalysisById(analysisId);
    if (!analysis) {
      res.status(404).json({ error: "Análise não encontrada." });
      return;
    }

    let comparison = null;
    if (baselineAnalysisId) {
      const baseline = await this.repository.getAnalysisById(baselineAnalysisId);
      if (baseline) {
        comparison = buildComparison(baseline, analysis);
      }
    }

    const html = generateReportHtml(analysis, comparison);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }
}