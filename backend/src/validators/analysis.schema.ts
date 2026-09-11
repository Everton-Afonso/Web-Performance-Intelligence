import { z } from "zod";

export const strategySchema = z.enum(["mobile", "desktop", "both"]);

export const analyzeRequestSchema = z.object({
  url: z.string().trim().min(1, "Informe uma URL para análise."),
  strategy: strategySchema.default("mobile")
});

export type AnalyzeRequestInput = z.infer<typeof analyzeRequestSchema>;