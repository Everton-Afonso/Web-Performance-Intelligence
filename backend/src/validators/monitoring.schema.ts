import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para o projeto.")
});

export const createMonitorSchema = z.object({
  siteId: z.string().min(1, "Informe o site."),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
  intervalHours: z
    .number({ coerce: true })
    .int("O intervalo deve ser um número inteiro.")
    .min(1, "O intervalo mínimo é 1 hora.")
});

export const createGoalSchema = z.object({
  siteId: z.string().min(1, "Informe o site."),
  metric: z
    .string()
    .min(1, "Informe a métrica.")
    .refine(
      (v) => ["LCP", "INP", "CLS", "FCP", "TTFB", "TBT", "SI", "performance-score"].includes(v),
      { message: "Métrica inválida." }
    ),
  target: z.number({ coerce: true }).positive("Informe um valor de meta maior que zero."),
  operator: z.enum(["lte", "gte"]).default("lte")
});