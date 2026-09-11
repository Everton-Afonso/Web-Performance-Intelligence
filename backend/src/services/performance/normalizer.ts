/**
 * Metric normalization (RF-14 / CA-05).
 *
 * Produces a consistent representation for every metric: id, display name,
 * numeric value, unit, status and a human readable value using the unit
 * conventions required by the acceptance criteria.
 *
 * Display conventions (matching the V1 experience example, sections 4.1/7.2):
 * - LCP, FCP, TTFB, Speed Index are displayed in seconds.
 * - INP and TBT are displayed in milliseconds.
 * - CLS is displayed with two decimal places.
 *
 * The classifier interprets values in each metric's native unit, so the
 * normalizer maps the stored unit back to the classification unit.
 */

import type {
  Metric,
  MetricName,
  MetricSource,
  MetricStatus,
  MetricUnit
} from "../../types/analysis.js";
import { classifyMetric, classifyScore } from "./classifier.js";

/** Classification unit per metric (what classifier thresholds expect). */
const CLASSIFICATION_UNIT: Partial<Record<MetricName, "s" | "ms" | "absolute" | "score">> = {
  LCP: "s",
  INP: "ms",
  CLS: "absolute",
  FCP: "s",
  TTFB: "s",
  TBT: "ms",
  SI: "s"
};

/** Display unit per metric. */
const DISPLAY_UNIT: Partial<Record<MetricName, "s" | "ms">> = {
  LCP: "s",
  FCP: "s",
  TTFB: "s",
  SI: "s",
  INP: "ms",
  TBT: "ms"
};

/**
 * Pads using a stable dot-decimal representation. The backend exposes
 * machine-friendly display values; locale-aware formatting (`pt-BR` uses
 * comma) is a frontend/i18n concern (RNF-12).
 */
function pad(value: number, digits: number): string {
  return value.toFixed(digits);
}

/**
 * Converts a raw value (in `sourceUnit`) into the given display unit.
 */
export function toDisplayValue(value: number, sourceUnit: MetricUnit, displayUnit: "s" | "ms"): string {
  let number = value;
  if (sourceUnit === "ms" && displayUnit === "s") {
    number = value / 1000;
  } else if (sourceUnit === "s" && displayUnit === "ms") {
    number = value * 1000;
  }
  return displayUnit === "ms" ? `${pad(number, 0)} ms` : `${pad(number, 1)} s`;
}

export function formatValue(value: number, sourceUnit: MetricUnit, name: MetricName): string {
  if (name === "CLS") {
    return pad(value, 2);
  }
  if (name === "performance-score") {
    return pad(value, 0);
  }
  const displayUnit = DISPLAY_UNIT[name] ?? "s";
  return toDisplayValue(value, sourceUnit, displayUnit);
}

export function statusFor(
  name: MetricName,
  value: number,
  unit: MetricUnit
): MetricStatus | null {
  if (name === "performance-score") {
    return classifyScore(value);
  }

  const classificationUnit = CLASSIFICATION_UNIT[name];
  let classifierValue = value;
  if (classificationUnit === "s" && unit === "ms") {
    classifierValue = value / 1000;
  } else if (classificationUnit === "ms" && unit === "s") {
    classifierValue = value * 1000;
  }

  return classifyMetric(name, classifierValue);
}

export function normalizeMetric(source: MetricSource): Metric {
  const { id, name, value: raw, unit: rawUnit, description } = source;
  const value = raw ?? null;
  const status = value === null ? null : statusFor(id, value, rawUnit);
  const displayValue =
    value === null ? "Não disponível" : formatValue(value, rawUnit, id);

  return {
    id,
    name,
    value,
    unit: rawUnit,
    status,
    displayValue,
    description
  };
}

export function normalizeMetrics(sources: MetricSource[]): Metric[] {
  return sources.map(normalizeMetric);
}