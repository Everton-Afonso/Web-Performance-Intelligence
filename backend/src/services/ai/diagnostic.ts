/**
 * V3 — Explanation/Intelligence engine (section 8 of the specification).
 *
 * This is a deterministic, evidence-based diagnostic layer: it converts the
 * Lighthouse audits + Core Web Vitals metrics into actionable recommendations,
 * explicitly distinguishing:
 *   - thing called evidence (a audite detected / metric value)
 *   - probable cause (a hypothesis clearly marked as such)
 *   - recommendation (an actionable fix)
 *   - expected impact (estimation, only when there is basis)
 *
 * It groups related problems and never presents a hypothesis as a fact.
 */

import type { Audit, Metric } from "../../types/analysis.js";
import type { Recommendation } from "../../types/storage.js";

export interface DiagnosticInput {
  metrics: Metric[];
  audits: Audit[];
}

export type Priority = "P0" | "P1" | "P2";

interface EvidenceRule {
  /** regex matched against the audit id */
  auditPattern: RegExp;
  category: string;
  priority: (score: number | null) => Priority;
  title: string;
  problem: string;
  cause: string;
  recommendation: string;
  suggestedFix?: string;
  expectedImpact: "high" | "medium" | "low";
}

const IMAGE_CODE = `<img\n  src="/caminho/imagem.jpg"\n  width="1280"\n  height="720"\n  loading="lazy"\n  alt="descrição"\n/>`;

const AUDIT_RULES: EvidenceRule[] = [
  {
    auditPattern: /^unsized-images$/i,
    category: "CLS",
    priority: () => "P0",
    title: "Imagens sem dimensões reservadas causam deslocamento de layout",
    problem: "Elementos visuais estão sendo inseridos sem espaço reservado no layout.",
    cause: "Causa provável: componentes de imagem/banner carregam após o primeiro render sem width/height ou aspect-ratio definidos.",
    recommendation: "Reserve o espaço antes do carregamento definindo width/height ou aspect-ratio no container.",
    suggestedFix: IMAGE_CODE,
    expectedImpact: "high"
  },
  {
    auditPattern: /^layout-shift|^cumulative-layout-shift$/i,
    category: "CLS",
    priority: () => "P0",
    title: "Estabilidade visual abaixo do esperado (CLS elevado)",
    problem: "A página apresenta deslocamento visual depois que o usuário começa a interagir.",
    cause: "Causa provável: conteúdo injetado acima do texto adicional (ads, banners, fontes) sem espaço reservado.",
    recommendation: "Reserve dimensões para mídia/ads, carregue fontes com font-display para evitar FOIT/FOUT e posicione elementos dinâmicos abaixo da área visível.",
    suggestedFix: `.imagem-hero {\n  aspect-ratio: 16 / 9;\n  width: 100%;\n  height: auto;\n}`,
    expectedImpact: "high"
  },
  {
    auditPattern: /^render-blocking-resources$/i,
    category: "LCP",
    priority: () => "P0",
    title: "Recursos bloqueiam a renderização inicial",
    problem: "CSS/JS síncronos no <head> atrasam a primeira pintura e o LCP.",
    cause: "Causa provável: stylesheets e scripts render-blocking são carregados de forma síncrona no caminho crítico.",
    recommendation: "Adie scripts não críticos com defer/async e pré-carregue o CSS crítico inline para o restante.",
    suggestedFix: `<link rel="preload" as="style" href="/css/critico.css" />\n<link rel="stylesheet" href="/css/critico.css" />\n<script src="/js/aplicacao.js" defer></script>`,
    expectedImpact: "high"
  },
  {
    auditPattern: /^unused-javascript$/i,
    category: "JS",
    priority: (score) => (score !== null && score === 0 ? "P0" : "P1"),
    title: "JavaScript não utilizado aumenta o trabalho do main thread",
    problem: "Grande parte do JS enviado não é executada no carregamento, aumentando TBT/INP.",
    cause: "Causa provável: bundles monolíticos com bibliotecas inteiras incluídas sem tree-shaking ou code-splitting.",
    recommendation: "Habilite code-splitting, remova dependências não usadas e carregue módulos pesados sob demanda.",
    suggestedFix: `// Exemplo (React/Vite): divisão por rota\nconst Painel = lazy(() => import("./Painel"));\n\n<Suspense fallback={<Loader />}>\n  <Painel />\n</Suspense>`,
    expectedImpact: "high"
  },
  {
    auditPattern: /^bootup-time$/i,
    category: "JS",
    priority: () => "P1",
    title: "Tempo de execução inicial do JavaScript elevado",
    problem: "O custo de parse/compile do JS e a execução no boot aumentam o bloqueio do thread.",
    cause: "Causa provável: muitos scripts no carregamento inicial e tarefas longas no main thread.",
    recommendation: "Reduza o custo de boot: menos código no bundle inicial, aguarde o idle para tarefas não críticas.",
    suggestedFix: `requestIdleCallback(() => {\n  // tarefas não críticas\n  registrarTelemetria();\n});`,
    expectedImpact: "medium"
  },
  {
    auditPattern: /^mainthread-work-breakdown$/i,
    category: "JS",
    priority: () => "P1",
    title: "Trabalho prolongado no main thread",
    problem: "O main thread permanece ocupado além do ideal, piorando a capacidade de resposta.",
    cause: "Causa provável: renderização e scripts disputando o thread sem quebra em tarefas curtas.",
    recommendation: "Quebre o trabalho em blocos menores e mova tarefas pesadas para web workers.",
    suggestedFix: `// Web worker\nconst worker = new Worker("/workers/processador.js");`,
    expectedImpact: "medium"
  },
  {
    auditPattern: /^unused-css-rules$/i,
    category: "CSS",
    priority: () => "P2",
    title: "Regras CSS não utilizadas",
    problem: "CSS morto é enviado, atrasando a renderização (FCP) e aumentando o download.",
    cause: "Causa provável: folhas de estilo antigas ou de bibliotecas incluídas por completo.",
    recommendation: "Remova CSS não utilizado com coverage/devtools e products dividindo estilos por rota (CSS modules).",
    expectedImpact: "medium"
  },
  {
    auditPattern: /^uses-responsive-images$/i,
    category: "imagens",
    priority: () => "P2",
    title: "Imagens não são responsivas",
    problem: "Imagens maiores que o necessário são enviadas para telas menores.",
    cause: "Causa provável: atributos srcset/sizes ausentes fixam um único tamanho.",
    recommendation: "Use srcset + sizes para servir a resolução adequada por viewport.",
    suggestedFix: `<img\n  src="/foto-800.jpg"\n  srcset="/foto-480.jpg 480w, /foto-800.jpg 800w, /foto-1200.jpg 1200w"\n  sizes="(max-width: 640px) 100vw, 800px"\n  alt="descrição"\n/>`,
    expectedImpact: "medium"
  },
  {
    auditPattern: /^offscreen-images$/i,
    category: "imagens",
    priority: () => "P2",
    title: "Imagens fora da tela são carregadas cedo demais",
    problem: "Imagens abaixo da dobra competem por largura de banda com recursos críticos.",
    cause: "Causa provável: imgs abaixo da dobra sem lazy loading.",
    recommendation: "Adie o carregamento das imagens com loading=\"lazy\" e defina dimensões para evitar CLS.",
    expectedImpact: "medium"
  },
  {
    auditPattern: /^modern-image-formats|uses-optimized-images|uses-optimized-images$/i,
    category: "imagens",
    priority: () => "P1",
    title: "Imagens podem usar formatos modernos e otimização",
    problem: "Formatos como AVIF/WebP reduzem o peso sem custo perceptível.",
    cause: "Causa provável: imagens servidas em JPEG/PNG sem conversão e sem compressão",
    recommendation: "Converta para AVIF/WebP quando suportado e otimize o tamanho no build.",
    suggestedFix: `// build pipeline (ex: vite-plugin-imagemin ou sharp)\nsharp(input).webp({ quality: 80 }).toFile(output);`,
    expectedImpact: "medium"
  },
  {
    auditPattern: /^uses-text-compression$/i,
    category: "servidor",
    priority: () => "P2",
    title: "Compressão de texto não ativa",
    problem: "HTML/CSS/JS trafegam sem gzip/brotli, aumentando o TTFB e a transferência.",
    cause: "Causa provável: compressão desativada no servidor/reverse proxy.",
    recommendation: "Ative gzip/brotli no servidor para conteúdo de texto e o nível de gzip >= min_length.",
    suggestedFix: `# nginx\ngzip on;\ngzip_types text/plain text/css application/json application/javascript;`,
    expectedImpact: "medium"
  },
  {
    auditPattern: /^server-response-time$/i,
    category: "servidor",
    priority: () => "P0",
    title: "Resposta inicial do servidor lenta (TTFB)",
    problem: "O navegador espera muito pelo primeiro byte da resposta.",
    cause: "Causa provável: renderização no servidor lenta, banco de dados ou falta de cache/edge.",
    recommendation: "Investigue o tempo de resposta da origem, use cache (CDN/edge) para conteúdo público e otimize queries.",
    suggestedFix: `// usa cache de resposta HTTP no CDN\nCache-Control: public, max-age=300, stale-while-revalidate=600`,
    expectedImpact: "high"
  }
];

/**
 * Metric-level diagnostic rules. Used when the metric itself is poor and no
 * specific audit carries more evidence for the same category.
 */
const METRIC_RULES: Array<{
  metric: string;
  category: string;
  priority: Priority;
}> = [
  { metric: "LCP", category: "LCP", priority: "P0" },
  { metric: "INP", category: "INP", priority: "P0" },
  { metric: "CLS", category: "CLS", priority: "P0" },
  { metric: "FCP", category: "FCP", priority: "P1" },
  { metric: "TTFB", category: "servidor", priority: "P0" },
  { metric: "TBT", category: "JS", priority: "P1" }
];

const METRIC_TEMPLATES: Record<
  string,
  { title: string; problem: string; cause: string; recommendation: string; suggestedFix?: string }
> = {
  LCP: {
    title: "Largest Contentful Paint acima do limite recomendado",
    problem: "O maior elemento visível demora para renderizar no viewport.",
    cause: "Causa provável: recurso de renderização lento, imagem/hero pesada ou CSS/JS bloqueando o caminho crítico.",
    recommendation: "Priorize o LCP: pré-carregue o herói, otimize a imagem e reduza o caminho crítico de CSS/JS.",
    suggestedFix: `<link rel="preload" as="image" href="/hero.webp">`
  },
  INP: {
    title: "Capacidade de resposta à interação acima do limite (INP)",
    problem: "Respostas a cliques/toques demoram além do aceitável.",
    cause: "Causa provável: tarefas longas, listeners pesados no main thread ou renderização custosa após interação.",
    recommendation: "Reduza tarefas longas, use requestIdleCallback e mantenha a lista de eventos simples.",
    suggestedFix: `// divida o trabalho e evite bloqueio do main thread\nfor (const item of items) {\n  await new Promise((r) => setTimeout(r, 0));\n  processar(item);\n}`
  },
  CLS: {
    title: "Cumulative Layout Shift acima do limite",
    problem: "O layout muda visivelmente após o carregamento inicial.",
    cause: "Causa provável: inserção de elementos sem espaço reservado (banners, imagens, fontes, iframes).",
    recommendation: "Defina dimensões, use reserve space e apply font-display para evitar deslocamentos.",
    suggestedFix: IMAGE_CODE
  },
  FCP: {
    title: "First Contentful Paint acima do limite",
    problem: "O primeiro conteúdo visível demora a aparecer.",
    cause: "Causa provável: render-blocking, servidor lento ou recursos de início pesados.",
    recommendation: "Reduza recursos de renderização inicial, aplique CSS crítico inline e otimize o servidor."
  },
  TTFB: {
    title: "Tempo até o primeiro byte elevado",
    problem: "A resposta inicial do servidor está lenta.",
    cause: "Causa provável: servidor/banco, ausência de cache ou falta de CDN.",
    recommendation: "Otimize o backend, use cache com stale-while-revalidate e um CDN próximo."
  },
  TBT: {
    title: "Tempo de bloqueio total elevado",
    problem: "O main thread fica bloqueado entre FCP e time to interactive.",
    cause: "Causa provável: execução de JS extensa no carregamento.",
    recommendation: "Reduza JS sem uso, faça code-splitting e minimize o trabalho do main thread."
  }
};

function metricOf(metrics: Metric[], id: string): Metric | undefined {
  return metrics.find((m) => m.id === id);
}

function auditOf(audits: Audit[], pattern: RegExp): Audit | undefined {
  return audits.find((a) => pattern.test(a.auditId));
}

/**
 * Builds recommendations for a single analysis.
 * Groups related problems and returns them ordered by priority.
 */
export function diagnose(input: DiagnosticInput): Recommendation[] {
  const usedCategories = new Set<string>();
  const recommendations: Recommendation[] = [];

  // 1) Evidence first: failed audits with known rules.
  for (const rule of AUDIT_RULES) {
    const audit = auditOf(input.audits, rule.auditPattern);
    if (!audit) {
      continue;
    }
    const metric = metricOf(input.metrics, rule.category);
    const priority = rule.priority(audit.score);
    recommendations.push({
      targetType: "audit",
      targetId: audit.auditId,
      category: rule.category,
      priority,
      title: rule.title,
      description: rule.problem,
      cause: rule.cause,
      recommendedFix: rule.recommendation,
      suggestedFix: rule.suggestedFix,
      expectedImpact: rule.expectedImpact,
      evidence: [
        audit.title,
        audit.displayValue ? `Valor identificado: ${audit.displayValue}` : "",
        metric ? `Métrica relacionada: ${metric.id} = ${metric.displayValue}` : ""
      ].filter(Boolean)
    });
    usedCategories.add(rule.category);
  }

  // 2) Metric-level fallback for poor Core Web Vitals without a dedicated audit.
  for (const rule of METRIC_RULES) {
    if (usedCategories.has(rule.category)) {
      continue;
    }
    const metric = metricOf(input.metrics, rule.metric);
    if (!metric || (metric.status !== "poor" && metric.status !== "needs-improvement")) {
      continue;
    }
    const template = METRIC_TEMPLATES[rule.metric];
    if (!template) {
      continue;
    }
    const relatedAudit = input.audits.find((a) =>
      new RegExp(`^${rule.metric}`, "i").test(a.auditId)
    );
    recommendations.push({
      targetType: "metric",
      targetId: rule.metric,
      category: rule.category,
      priority: rule.priority,
      title: template.title,
      description: template.problem,
      cause: template.cause,
      recommendedFix: template.recommendation,
      suggestedFix: template.suggestedFix,
      expectedImpact: "high",
      evidence: [
        `${rule.metric} = ${metric.displayValue} (${metric.status})`,
        relatedAudit ? `Audit relacionado: ${relatedAudit.title}` : ""
      ].filter(Boolean)
    });
    usedCategories.add(rule.category);
  }

  // 3) Order by priority, then category.
  const order: Record<Priority, number> = { P0: 0, P1: 1, P2: 2 };
  return recommendations.sort((a, b) => {
    const diff = order[a.priority] - order[b.priority];
    if (diff !== 0) return diff;
    return a.category.localeCompare(b.category);
  });
}

/** Returns true when there is at least one P0/P1 problem (used by reports). */
export function hasHighImpact(recommendations: Recommendation[]): boolean {
  return recommendations.some((r) => r.priority === "P0" || r.priority === "P1");
}