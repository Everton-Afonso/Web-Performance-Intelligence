/**
 * Client + parser for the Chrome UX Report (CrUX) API v1 (V2 / Fase 4).
 *
 * Field data is optional: when the API is unavailable, the key is missing, or
 * the origin has no data, the service returns `null` so analysis continues.
 */

import type { FieldData } from "../../types/storage.js";
import type { MetricName, MetricSource } from "../../types/analysis.js";
import { normalizeMetric } from "../performance/normalizer.js";

export interface CruxClientOptions {
  apiUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

interface CruxResponse {
  record?: {
    key?: { origin?: string };
    collectionPeriod?: {
      firstDay?: { year?: number; month?: number; day?: number };
      lastDay?: { year?: number; month?: number; day?: number };
    };
    metrics?: Record<string, unknown>;
  };
  urlNormalizationDetails?: unknown;
  error?: { code?: number; message?: string; status?: string };
}

const FIELD_METRICS: Array<{ key: string; id: MetricName }> = [
  { key: "largest_contentful_paint", id: "LCP" },
  { key: "interaction_to_next_paint", id: "INP" },
  { key: "cumulative_layout_shift", id: "CLS" },
  { key: "first_contentful_paint", id: "FCP" },
  { key: "experimental_time_to_first_byte", id: "TTFB" }
];

function p75Of(value: unknown): number | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const record = value as { percentiles?: { p75?: unknown } };
  const p75 = record.percentiles?.p75;
  return typeof p75 === "number" && Number.isFinite(p75) ? p75 : null;
}

/**
 * Parses a CrUX record, normalizing metrics to the same Metric contract used
 * by lab data. Temporal metrics come in ms; CLS is an absolute value.
 */
export function parseCruxRecord(payload: unknown): FieldData | null {
  const response = payload as CruxResponse;
  const record = response?.record;
  if (!record?.metrics) {
    return null;
  }

  const origin = record.key?.origin;
  if (!origin) {
    return null;
  }

  const sources: MetricSource[] = FIELD_METRICS.map(({ key, id }) => {
    const value = p75Of(record.metrics?.[key]);
    const unit = id === "CLS" ? "" : "ms";
    return {
      id,
      name: id,
      value,
      unit,
      description: `Dados reais (CrUX) para ${origin}`
    };
  });

  const metrics = sources.map((s) => normalizeMetric(s));
  const hadAny = sources.some((s) => s.value !== null);
  if (!hadAny) {
    return null;
  }

  const period = record.collectionPeriod;
  const lastDay = period?.lastDay;

  return {
    origin,
    collectionPeriod: lastDay
      ? `${lastDay.year}-${String(lastDay.month ?? 0).padStart(2, "0")}-${String(lastDay.day ?? 0).padStart(2, "0")}`
      : undefined,
    metrics
  };
}

export class CruxService {
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: CruxClientOptions) {
    this.apiUrl = options.apiUrl;
    this.apiKey = options.apiKey && options.apiKey.length > 0 ? options.apiKey : undefined;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async fetchFieldData(url: string): Promise<FieldData | null> {
    if (!this.apiKey) {
      return null;
    }

    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const target = new URL(this.apiUrl);
      target.searchParams.set("key", this.apiKey);

      const res = await this.fetchFn(target.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin }),
        signal: controller.signal
      });

      if (!res.ok) {
        return null; // 403/404/429 -> no field data available
      }

      const payload: unknown = await res.json();
      return parseCruxRecord(payload);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}