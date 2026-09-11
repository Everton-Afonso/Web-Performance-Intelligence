import { z } from "zod";

export const createSiteSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para o site."),
  url: z
    .string()
    .trim()
    .min(1, "Informe a URL do site.")
    .url("URL inválida.")
    .refine(
      (v) => v.startsWith("http://") || v.startsWith("https://"),
      { message: "Informe uma URL iniciada por http:// ou https://." }
    )
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;