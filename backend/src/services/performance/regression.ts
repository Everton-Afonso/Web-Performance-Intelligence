/**
 * V4 — Regression detection and goal evaluation.
 *
 * Pure functions used by the monitoring scheduler to turn comparisons into
 * actionable alerts. "Relevant regression" means a metric got worse compared
 * to the previous analysis of the same site+strategy (a status downgrade OR a
 * numeric worsening beyond a tolerance threshold).
 */

import type { AnalysisRecord, AlertSeverity, GoalRecord } from "../../types/storage.js";
import type { Metric } from "../../types/analysis.js";

const LOWER_IS_BETTER: Record<string, boolean> = {
  LCP: true,
  INP: true,
  CLS: true,
  FCP: true,
  TTFB: true,
  TBT: true,
  SI: true,
  "performance-score": false
};

const STATUS_ORDER: Record<string, number> = {
  good: 0,
  "needs-improvement": 1,
  poor: 2
};

/** Numeric worsening considered relevant (relative to the old value). */
const WORSE_RELATIVE = 1.15; // +15%

export interface RegressionFinding {
  metric: string;
  severity: AlertSeverity;
  message: string;
  beforeValue: number | null;
  afterValue: number | null;
}

export function metricOf(metrics: Metric[], id: string): Metric | null {
  return metrics.find((m) => m.id === id) ?? null;
}

function statusDowngraded(before: Metric | null, after: Metric | null): boolean {
  if (!before?.status || !after?.status) {
    return false;
  }
  const beforeLevel = STATUS_ORDER[before.status];
  const afterLevel = STATUS_ORDER[after.status];
  if (beforeLevel === undefined || afterLevel === undefined) {
    return false;
  }
  return afterLevel > beforeLevel;
}

/** Detects metrics that clearly regressed compared to the previous analysis. */
export function detectRegressions(
  previous: AnalysisRecord,
  current: AnalysisRecord
): RegressionFinding[] {
  const findings: RegressionFinding[] = [];
  const metricIds = new Set<string>();

  for (const m of current.metrics) metricIds.add(m.id);
  for (const m of previous.metrics) metricIds.add(m.id);

  for (const id of metricIds) {
    const before = metricOf(previous.metrics, id);
    const after = metricOf(current.metrics, id);
    if (!before || !after || before.value === null || after.value === null) {
      continue;
    }

    const downgraded = statusDowngraded(before, after);
    if (downgraded) {
      const severity: AlertSeverity = after.status === "poor" ? "high" : "medium";
      findings.push({
        metric: id,
        severity,
        message: `${id} regrediu: ${before.displayValue || before.status} → ${after.displayValue || after.status}`,
        beforeValue: before.value,
        afterValue: after.value
      });
      continue;
    }

    // Numeric regression beyond tolerance while remaining in the same band.
    const lowerIsBetter = LOWER_IS_BETTER[id] ?? true;
    const beforeV = before.value;
    const afterV = after.value;
    const worsened = lowerIsBetter ? afterV > beforeV * WORSE_RELATIVE : afterV < beforeV * (1 / WORSE_RELATIVE);
    if (worsened) {
      findings.push({
        metric: id,
        severity: "medium",
        message: `${id} piorou numericamente: ${before.displayValue} → ${after.displayValue} (${id === "performance-score" ? "queda" : "aumento"} acima da tolerância)`,
        beforeValue: beforeV,
        afterValue: afterV
      });
    }
  }

  return findings;
}

export interface GoalEvaluation {
  goalId: string;
  metric: string;
  target: number;
  operator: GoalRecord["operator"];
  value: number | null;
  met: boolean;
  message: string;
}

/**
 * Checks whether the latest analysis meets the site goals.
 * "lte" means value ≤ target (used for lower-is-better); "gte" for higher-is-better.
 */
export function evaluateGoals(goals: GoalRecord[], analysis: AnalysisRecord): GoalEvaluation[] {
  return goals.map((goal) => {
    const metric = metricOf(analysis.metrics, goal.metric);
    const value = metric?.value ?? null;
    if (!metric || value === null) {
      return {
        goalId: goal.id,
        metric: goal.metric,
        target: goal.target,
        operator: goal.operator,
        value: null,
        met: false,
        message: `${goal.metric}: sem dados na última análise.`
      };
    }
    const met = goal.operator === "lte" ? value <= goal.target : value >= goal.target;
    return {
      goalId: goal.id,
      metric: goal.metric,
      target: goal.target,
      operator: goal.operator,
      value,
      met,
      message: `${goal.metric} ${met ? "atingiu" : "NÃO atingiu"} a meta (${metric.displayValue} ${goal.operator === "lte" ? "≤" : "≥"} ${goal.target})`
    };
  });
}