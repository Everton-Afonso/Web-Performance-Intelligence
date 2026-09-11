/**
 * HTML report generation (V2 / section 9 of the specification).
 *
 * Produces a self-contained, style-inlined HTML document. No external assets
 * are fetched, so the report can be opened in an email attachment, a PDF
 * export or the browser.
 */

import type { AnalysisRecord, ComparisonResult, FieldData, Recommendation } from "../../types/storage.js";
import type { Metric, Audit } from "../../types/analysis.js";

function escapeHtml(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STATUS_CLASS: Record<string, string> = {
  good: "status--good",
  "needs-improvement": "status--warn",
  poor: "status--poor"
};

const IMPACT_CLASS: Record<string, string> = {
  high: "impact--high",
  medium: "impact--medium",
  low: "impact--low"
};

const CSS = `
  body{font-family:system-ui,-apple-system,Roboto,sans-serif;color:#1a1a1a;margin:0;padding:24px 32px;line-height:1.55;background:#fafafa}
  h1,h2,h3{margin-top:0}
  .cover{margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #d1d5db}
  .cover h1{font-size:1.6rem}
  .cover small{color:#555}
  table{width:100%;border-collapse:collapse;font-size:.85rem;margin:12px 0 24px}
  th,td{text-align:left;padding:8px 10px;border:1px solid #e5e7eb}
  th{background:#f3f4f6;font-weight:600}
  .status--good{background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-weight:600}
  .status--warn{background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-weight:600}
  .status--poor{background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-weight:600}
  .impact--high{color:#dc2626;font-weight:700}
  .impact--medium{color:#d97706;font-weight:700}
  .impact--low{color:#16a34a;font-weight:700}
  .improved{color:#16a34a;font-weight:600}
  .regressed{color:#dc2626;font-weight:600}
  .unchanged{color:#6b7280}
  .section{margin-bottom:28px}
  .rec{padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;margin-bottom:14px}
  .rec__header{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px}
  .rec__priority{font-weight:700;color:#fff;padding:2px 8px;border-radius:12px;font-size:.75rem}
  .priority--p0{background:#dc2626}
  .priority--p1{background:#d97706}
  .priority--p2{background:#2563eb}
  .evidence-list{margin:8px 0;color:#6b7280;font-size:.85rem}
  .evidence-list li{margin-bottom:2px}
  pre{background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;overflow:auto;font-size:.8rem}
  .action-plan{margin:12px 0}
  .action-plan li{margin-bottom:8px}
  .audit-list{list-style:none;padding:0;margin:12px 0}
  .audit-list li{margin-bottom:12px;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
  .audit-list strong{display:block;margin-bottom:2px}
  .muted{color:#6b7280;font-size:.85rem}
  .footer{margin-top:48px;padding-top:12px;border-top:1px solid #d1d5db;font-size:.8rem;color:#6b7280}
`;

function tableRow(cells: Array<{ text: string; className?: string }>): string {
  return `<tr>${cells.map((c) => `<td${c.className ? ` class="${c.className}"` : ""}>${escapeHtml(c.text)}</td>`).join("")}</tr>`;
}

function statusHtml(status: string | null | null): string {
  if (!status) {
    return "—";
  }
  const cls = STATUS_CLASS[status] ?? "";
  return `<span class="${cls}">${escapeHtml(status)}</span>`;
}

function metricTable(metrics: Metric[]): string {
  const rows = metrics
    .filter((m) => m.id !== "performance-score")
    .map(
      (m) =>
        `<tr>
          <td>${escapeHtml(m.name)}</td>
          <td>${escapeHtml(m.displayValue)}</td>
          <td>${statusHtml(m.status)}</td>
        </tr>`
    )
    .join("");
  return `<table><thead><tr><th>Métrica</th><th>Valor</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function auditList(audits: Audit[]): string {
  if (audits.length === 0) {
    return `<p class="muted">Nenhum problema identificado.</p>`;
  }
  const items = audits
    .map(
      (a) =>
        `<li>
          <strong>${escapeHtml(a.title)}</strong>
          <span class="${IMPACT_CLASS[a.impact] ?? ""}">${escapeHtml(a.severity)} ${escapeHtml(a.impact)}</span>
          ${a.displayValue ? `<span class="muted"> — ${escapeHtml(a.displayValue)}</span>` : ""}
          <br/>${escapeHtml(a.description)}
        </li>`
    )
    .join("");
  return `<ul class="audit-list">${items}</ul>`;
}

const PRIORITY_BADGE: Record<string, string> = {
  P0: "priority--p0",
  P1: "priority--p1",
  P2: "priority--p2"
};

function webPageTestSection(analysis: AnalysisRecord): string {
  const wpt = analysis.webPageTest;
  if (!wpt) {
    return `<section class="section"><h2>WebPageTest (investigação avançada)</h2><p class="muted">Não executado / não disponível.</p></section>`;
  }
  if (wpt.status !== "completed") {
    return `<section class="section">
      <h2>WebPageTest (investigação avançada)</h2>
      <p><strong>Status:</strong> ${escapeHtml(wpt.status)} · <strong>testId:</strong> ${escapeHtml(wpt.testId)}</p>
      <p class="muted">Execute POST /api/analyses/:id/webpagetest e consulte o resultado para concluir.</p>
    </section>`;
  }

  const metricRows = wpt.metrics
    .map(
      (m) => `<tr>
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(m.displayValue)}</td>
        <td>${statusHtml(m.status)}</td>
      </tr>`
    )
    .join("");

  const requestRows = wpt.topRequests
    .map(
      (r) => `<tr>
        <td title="${escapeHtml(r.url)}">${escapeHtml(r.url.replace(/^https?:\/\//, ""))}</td>
        <td>${r.host}</td>
        <td>${escapeHtml(r.contentType)}</td>
        <td>${r.loadTime.toFixed(0)} ms</td>
        <td>${(r.bytes / 1024).toFixed(1)} kB</td>
        <td>${r.isThirdParty ? "sim" : "não"}</td>
      </tr>`
    )
    .join("");

  return `<section class="section">
    <h2>WebPageTest (investigação avançada)</h2>
    <p><strong>testId:</strong> ${escapeHtml(wpt.testId)} · <strong>waterfall:</strong>
      <a href="${escapeHtml(wpt.waterfallRef ?? "")}">abrir resultado</a></p>
    <p><strong>Request count:</strong> ${wpt.requests} · <strong>Bytes:</strong> ${(wpt.bytes / 1024).toFixed(1)} kB</p>
    <h3>Métricas do teste</h3>
    <table><thead><tr><th>Métrica</th><th>Valor</th><th>Status</th></tr></thead><tbody>${metricRows || '<tr><td colspan="3" class="muted">sem métricas disponíveis</td></tr>'}</tbody></table>
    <h3>Requests mais lentos (evidência de waterfall)</h3>
    <table><thead><tr><th>Recurso</th><th>Host</th><th>Tipo</th><th>Load</th><th>Bytes</th><th>3rd party</th></tr></thead><tbody>${requestRows || '<tr><td colspan="6" class="muted">sem dados de request</td></tr>'}</tbody></table>
  </section>`;
}

function recommendationBlock(r: Recommendation): string {
  const code = r.suggestedFix
    ? `<pre><code>${escapeHtml(r.suggestedFix)}</code></pre>`
    : "";
  const evidence = r.evidence.length
    ? `<ul class="evidence-list">${r.evidence.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
    : "";
  return `<article class="rec">
    <header class="rec__header">
      <span class="rec__priority ${PRIORITY_BADGE[r.priority] ?? ""}">${escapeHtml(r.priority)}</span>
      <strong>${escapeHtml(r.title)}</strong>
      <span class="muted">${escapeHtml(r.category)} · impacto ${escapeHtml(r.expectedImpact)}</span>
    </header>
    <p><strong>Problema:</strong> ${escapeHtml(r.description)}</p>
    <p><strong>Causa provável:</strong> ${escapeHtml(r.cause)}</p>
    <p><strong>Recomendação:</strong> ${escapeHtml(r.recommendedFix)}</p>
    ${evidence}
    ${code}
  </article>`;
}

function recommendationSection(analysis: AnalysisRecord): string {
  if (analysis.recommendations.length === 0) {
    return `<section class="section"><h2>Diagnóstico e recomendações</h2><p class="muted">Nenhuma recomendação gerada (sem problemas relevantes identificados).</p></section>`;
  }
  const blocks = analysis.recommendations.map(recommendationBlock).join("");
  return `<section class="section">
    <h2>Diagnóstico e recomendações (V3 — IA)</h2>
    <p class="muted">Causas prováveis são hipóteses baseadas nas evidências; sugestões de código são aplicáveis apenas quando há evidência suficiente.</p>
    ${blocks}
  </section>`;
}

function fieldDataTable(fieldData: FieldData | null): string {
  if (!fieldData) {
    return `<p class="muted">Dados de campo (CrUX) não disponíveis.</p>`;
  }
  const rows = fieldData.metrics
    .filter((m) => m.id !== "performance-score")
    .map(
      (m) =>
        `<tr>
          <td>${escapeHtml(m.name)}</td>
          <td>${escapeHtml(m.displayValue)}</td>
          <td>${statusHtml(m.status)}</td>
        </tr>`
    )
    .join("");
  return `<p><strong>Período coletado:</strong> ${escapeHtml(fieldData.collectionPeriod ?? "—")}</p>
  <table><thead><tr><th>Métrica</th><th>Valor (field)</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function labFieldTable(analysis: AnalysisRecord): string {
  if (!analysis.fieldData) {
    return `<p class="muted">Sem dados de campo para comparação Lab ↔ Field.</p>`;
  }
  const labMetrics = analysis.metrics.filter((m) => m.id !== "performance-score");
  const fieldMap = Object.fromEntries(analysis.fieldData.metrics.map((m) => [m.id, m]));
  const rows = labMetrics.map((lab) => {
    const field = fieldMap[lab.id];
    return `<tr>
      <td>${escapeHtml(lab.name)}</td>
      <td>${escapeHtml(lab.displayValue)}</td>
      <td>${statusHtml(lab.status)}</td>
      <td>${escapeHtml(field?.displayValue ?? "—")}</td>
      <td>${statusHtml(field?.status ?? null)}</td>
    </tr>`;
  });
  return `<table><thead><tr><th>Métrica</th><th>Lab</th><th>Lab Status</th><th>Field</th><th>Field Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function comparisonTable(comparison: ComparisonResult): string {
  const scoreRow = `<tr>
    <td>Performance Score</td>
    <td>${comparison.scoreBefore ?? "—"}</td>
    <td>${comparison.scoreAfter ?? "—"}</td>
    <td>${comparison.scoreDelta ?? "—"}</td>
    <td>${comparison.scorePct !== null ? `${comparison.scorePct.toFixed(1)}%` : "—"}</td>
    <td>${comparison.scoreDirection}</td>
  </tr>`;
  const rows = comparison.metrics
    .map((m) => {
      const deltaPct = m.pctChange !== null ? `${m.pctChange.toFixed(1)}%` : "—";
      return `<tr>
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(m.before?.displayValue ?? "—")}</td>
        <td>${escapeHtml(m.after?.displayValue ?? "—")}</td>
        <td>${m.delta !== null ? m.delta.toFixed(2) : "—"}</td>
        <td>${deltaPct}</td>
        <td class="${m.direction}">${m.direction}</td>
      </tr>`;
    })
    .join("");
  return `<table><thead><tr><th>Métrica</th><th>Antes</th><th>Depois</th><th>Δ</th><th>%</th><th>Direção</th></tr></thead><tbody>${scoreRow}${rows}</tbody></table>`;
}

/**
 * Generates a full professional HTML report for the given analysis, with an
 * optional before/after comparison (if two analyses are compared).
 */
export function generateReportHtml(
  analysis: AnalysisRecord,
  comparison?: ComparisonResult | null
): string {
  const title = `Relatório de Performance — ${analysis.url}`;
  const cwvMetrics = ["LCP", "INP", "CLS"].map((id) => analysis.metrics.find((m) => m.id === id)).filter(Boolean) as Metric[];
  const complementMetrics = ["FCP", "TTFB", "TBT", "SI"].map((id) => analysis.metrics.find((m) => m.id === id)).filter(Boolean) as Metric[];

  const scoreStatus = analysis.score !== null
    ? (analysis.score >= 90 ? "good" : analysis.score >= 50 ? "needs-improvement" : "poor")
    : null;

  const cvwStatusHtml =
    cwvMetrics
      .map((m) => `<strong>${escapeHtml(m.name)}:</strong> ${escapeHtml(m.displayValue)} ${statusHtml(m.status)}`)
      .join(" &nbsp; ");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<section class="cover">
  <h1>${escapeHtml(title)}</h1>
  <p><strong>Estratégia:</strong> ${escapeHtml(analysis.strategy)} &nbsp;|&nbsp;
     <strong>Site:</strong> ${escapeHtml(analysis.site.name)} (${escapeHtml(analysis.site.url)})</p>
  <p><strong>Data da análise:</strong> ${escapeHtml(analysis.analyzedAt)} &nbsp;|&nbsp;
     <strong>Performance Score:</strong>
     <span class="${statusClassForScore(scoreStatus)}">${analysis.score ?? "—"}</span></p>
  <p>${cvwStatusHtml}</p>
</section>

<section class="section">
  <h2>Resumo executivo</h2>
  <p>Problemas encontrados: <strong>${analysis.audits.length}</strong>. Alto impacto:
     <strong>${analysis.audits.filter((a) => a.impact === "high").length}</strong>.</p>
  ${comparison ? `<p><strong>Evolução:</strong> score de ${comparison.scoreBefore ?? "?"} para ${comparison.scoreAfter ?? "?"} (${comparison.scoreDirection}).</p>` : ""}
</section>

<section class="section">
  <h2>Core Web Vitals</h2>
  ${metricTable(cwvMetrics)}
</section>

<section class="section">
  <h2>Métricas complementares</h2>
  ${metricTable(complementMetrics)}
</section>

<section class="section">
  <h2>Dados de campo (CrUX)</h2>
  ${fieldDataTable(analysis.fieldData)}
</section>

${webPageTestSection(analysis)}

<section class="section">
  <h2>Lab ↔ Field</h2>
  ${labFieldTable(analysis)}
</section>

<section class="section">
  <h2>Problemas prioritários</h2>
  ${auditList(analysis.audits)}
</section>

${recommendationSection(analysis)}

${comparison ? `<section class="section">
  <h2>Comparação antes / depois</h2>
  ${comparisonTable(comparison)}
</section>` : ""}

<section class="section">
  <h2>Plano de ação (ordenado por prioridade)</h2>
  <ol class="action-plan">
    ${analysis.recommendations
      .map(
        (r) =>
          `<li><strong>[${escapeHtml(r.priority)}]</strong> ${escapeHtml(r.title)} — ${escapeHtml(r.recommendedFix)}</li>`
      )
      .join("")}
  </ol>
  <p><em>Recomendações geradas pela camada de IA com base nas evidências; os audits acima estão ordenados por severidade e impacto.</em></p>
</section>

<div class="footer">
  <p>Gerado por Web Performance Intelligence · ${escapeHtml(new Date().toISOString())}</p>
  <p><strong>URL solicitada:</strong> ${escapeHtml(analysis.url)} · <strong>URL final:</strong> ${escapeHtml(analysis.finalUrl)}</p>
</div>
</body>
</html>`;
}

function statusClassForScore(score: string | null): string {
  if (!score) {
    return "";
  }
  return STATUS_CLASS[score] ?? "";
}