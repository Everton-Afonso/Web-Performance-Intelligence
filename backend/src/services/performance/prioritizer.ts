/**
 * Audit prioritization (RF-16 / RNF-09 / CA-06).
 *
 * Failed audits (score < 1) are sorted by severity (lowest score first) and
 * grouped into impact buckets. A P0 audit has no available score
 * (score === null), P1/P2 use score buckets, mirroring how Lighthouse signals
 * "error"/no-value audits as the most urgent issues.
 */

import type { Audit, AuditSeverity } from "../../types/analysis.js";
import type { ParsedAudit } from "../pagespeed/parser.js";

const SEVERITY_PRIORITY: Record<AuditSeverity, number> = { P0: 0, P1: 1, P2: 2 };
export const IMPACT_LABEL: Record<Audit["impact"], "Alto" | "Médio" | "Baixo"> = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo"
};

export function severityForScore(score: number | null): AuditSeverity {
  if (score === null) {
    return "P0";
  }
  if (score === 0) {
    return "P1";
  }
  return "P2";
}

export function impactForScore(score: number | null): Audit["impact"] {
  if (score === null) {
    return "high";
  }
  if (score === 0) {
    return "high";
  }
  if (score < 0.5) {
    return "medium";
  }
  return "low";
}

export function prioritizeAudits(audits: ParsedAudit[]): Audit[] {
  const mapped: Audit[] = audits.map((audit) => {
    const severity = severityForScore(audit.score);
    return {
      auditId: audit.auditId,
      title: audit.title,
      description: audit.description,
      score: audit.score,
      displayValue: audit.displayValue,
      numericValue: audit.numericValue,
      severity,
      impact: impactForScore(audit.score)
    };
  });

  // score null (P0) goes first; then lower score first (more urgent).
  mapped.sort((a, b) => {
    const sDiff = SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity];
    if (sDiff !== 0) {
      return sDiff;
    }
    return (a.score ?? -1) - (b.score ?? -1);
  });

  return mapped;
}

export function countAudits(audits: Audit[]): { total: number; highImpact: number } {
  return {
    total: audits.length,
    highImpact: audits.filter((a) => a.impact === "high").length
  };
}