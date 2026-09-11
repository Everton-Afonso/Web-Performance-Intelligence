/**
 * Lightweight i18n foundation (RNF-12).
 *
 * All visible texts are centralized in a dictionary keyed by locale so the
 * product can be localized later without touching components. pt-BR is the
 * default; numbers use `Intl` with the active locale.
 */

export type Locale = "pt-BR" | "en-US";

const messages: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    "app.title": "Web Performance Intelligence",
    "app.tagline": "Performance Auditor",
    "form.label.url": "URL do site",
    "form.placeholder.url": "https://meusite.com",
    "form.label.strategy": "Dispositivo",
    "form.strategy.mobile": "Mobile",
    "form.strategy.desktop": "Desktop",
    "form.submit": "Analisar",
    "form.submit.loading": "Analisando",
    "form.error.min": "Informe uma URL para análise.",
    "form.error.invalid": "Informe uma URL válida iniciada por http:// ou https://.",
    "loading.title": "Executando auditoria",
    "loading.hint": "O Lighthouse está analisando a página. Isso pode levar alguns segundos.",
    "summary.title": "Resumo da auditoria",
    "summary.problems": "problemas encontrados",
    "summary.high": "alto impacto",
    "result.label.requested": "URL solicitada",
    "result.label.final": "URL final",
    "result.label.strategy": "Estratégia",
    "result.label.date": "Analisado em",
    "result.empty": "Não há problemas de performance para exibir.",
    "score.label": "Performance",
    "metrics.title": "Core Web Vitals",
    "audits.title": "Problemas prioritários",
    "audits.subtitle": "Ordenados por severidade e impacto.",
    "metric.available": "Disponível",
    "metric.unavailable": "Não disponível",
    "status.good": "Bom",
    "status.needs-improvement": "Precisa melhorar",
    "status.poor": "Ruim",
    "audit.severity.p0": "Crítico",
    "audit.severity.p1": "Alto",
    "audit.severity.p2": "Médio",
    "impact.high": "Alto impacto",
    "impact.medium": "Médio impacto",
    "impact.low": "Baixo impacto",
    "error.title": "Não foi possível concluir a análise",
    "error.retry": "Tente novamente"
  },
  "en-US": {
    "app.title": "Web Performance Intelligence",
    "app.tagline": "Performance Auditor",
    "form.label.url": "Site URL",
    "form.placeholder.url": "https://mysite.com",
    "form.label.strategy": "Device",
    "form.strategy.mobile": "Mobile",
    "form.strategy.desktop": "Desktop",
    "form.submit": "Analyze",
    "form.submit.loading": "Analyzing",
    "form.error.min": "Please enter a URL to analyze.",
    "form.error.invalid": "Enter a valid URL starting with http:// or https://.",
    "loading.title": "Running audit",
    "loading.hint": "Lighthouse is analyzing the page. This may take a few seconds.",
    "summary.title": "Audit summary",
    "summary.problems": "issues found",
    "summary.high": "high impact",
    "result.label.requested": "Requested URL",
    "result.label.final": "Final URL",
    "result.label.strategy": "Strategy",
    "result.label.date": "Analyzed on",
    "result.empty": "No performance issues to display.",
    "score.label": "Performance",
    "metrics.title": "Core Web Vitals",
    "audits.title": "Top issues",
    "audits.subtitle": "Ordered by severity and impact.",
    "metric.available": "Available",
    "metric.unavailable": "Not available",
    "status.good": "Good",
    "status.needs-improvement": "Needs Improvement",
    "status.poor": "Poor",
    "audit.severity.p0": "Critical",
    "audit.severity.p1": "High",
    "audit.severity.p2": "Medium",
    "impact.high": "High impact",
    "impact.medium": "Medium impact",
    "impact.low": "Low impact",
    "error.title": "Could not complete the audit",
    "error.retry": "Try again"
  }
};

const DEFAULT_LOCALE: Locale = "pt-BR";

export function useI18n(locale: Locale = DEFAULT_LOCALE) {
  const dict = messages[locale] ?? messages[DEFAULT_LOCALE];

  function t(key: string): string {
    return dict[key] ?? key;
  }

  function number(value: number, options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(locale, options).format(value);
  }

  function date(value: string): string {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  return { t, number, date, locale };
}

export type I18n = ReturnType<typeof useI18n>;