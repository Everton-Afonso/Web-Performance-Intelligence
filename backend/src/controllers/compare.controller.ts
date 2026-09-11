import type { Request, Response } from "express";
import { z } from "zod";
import type { Repository } from "../types/storage.js";
import { buildComparison } from "../services/performance/comparison.js";

const compareSchema = z.object({
  baselineAnalysisId: z.string().min(1, "Informe o ID da análise baseline.")
});

export class CompareController {
  constructor(private readonly repository: Repository) {}

  async compare(req: Request, res: Response): Promise<void> {
    const { baselineAnalysisId } = compareSchema.parse(req.body);
    const currentId = req.params.id!;

    const [baseline, current] = await Promise.all([
      this.repository.getAnalysisById(baselineAnalysisId),
      this.repository.getAnalysisById(currentId)
    ]);

    if (!baseline) {
      res.status(404).json({ error: "Análise baseline não encontrada." });
      return;
    }
    if (!current) {
      res.status(404).json({ error: "Análise atual não encontrada." });
      return;
    }

    const result = buildComparison(baseline, current);
    const persisted = await this.repository.createComparison({
      baselineAnalysisId: baseline.id,
      currentAnalysisId: current.id,
      result
    });

    res.status(201).json(persisted);
  }
}