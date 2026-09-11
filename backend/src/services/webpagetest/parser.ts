/**
 * WebPageTest result parser (RF-21).
 *
 * WPT returns a huge, version-dependent JSON. This parser extracts the subset
 * of interest defensively (never throws on missing fields):
 * - loading metrics (TTFB, FCP, LCP, CLS, TBT/SpeedIndex when present)
 * - request count, total bytes, waterfall evidence (top slowest requests)
 * - third-party detection by host, and metadata (location/browser)
 */

import type { Metric, MetricName, MetricStatus, MetricUnit } from "../../types/analysis.js";
import type {
  WebPageTestRequestEvidence,
  WebPageTestSummary
} from "../../types/webpagetest.js";

interface RequestEntry {
  url?: string;
  host?: string;
  contentType?: string;
  type?: string;
  startTime?: number | string;
  loadTime?: number | string;
  bytesIn?: number | string;
  requestId?: string;
  [key: string]: unknown;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.length > 0 && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

/** Reads a metric value from common WPT field names. */
function pickValue(view: Record<string, unknown>, keysArr: string[]): number | null {
  for (const key of keysArr) {
    const v = num(view[key]);
    if (v !== null) return v;
  }
  return null;
}

function buildMetric(id: MetricName, name: string, value: number, unit: MetricUnit): Metric {
  let status: MetricStatus | null = null;
  if (id === "CLS") {
    status = value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
  } else {
    const seconds = unit === "ms" ? value / 1000 : value;
    status =
      seconds <= 2.5 ? "good" : seconds <= 4 ? "needs-improvement" : "poor";
  }
  return {
    id,
    name,
    value,
    unit,
    status,
    source: "wpt",
    displayValue:
      id === "CLS"
        ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : unit === "ms"
          ? `${(value / 1000).toFixed(1)} s`
          : String(value)
  };
}

/** Extracts the first (or median) firstView result from the raw payload. */
function firstView(data: Record<string, unknown>): Record<string, unknown> | null {
  const runs = data["runs"] as Record<string, unknown> | undefined;
  if (runs) {
    const firstKey = Object.keys(runs)[0];
    const run = firstKey ? (runs[firstKey] as Record<string, unknown>) : undefined;
    const fv = run?.firstView as Record<string, unknown> | undefined;
    if (fv) return fv;
  }
  const median = data["median"] as Record<string, unknown> | undefined;
  if (median) {
    const fv = median.firstView as Record<string, unknown> | undefined;
    if (fv) return fv;
  }
  return null;
}

/** Pulls a metrics table (e.g. from view.metrics) into a map. */
function metricsMap(view: Record<string, unknown>): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const table = view["metrics"] as unknown;
  const list = Array.isArray(table) ? table : (table as { items?: unknown[] })?.items;
  if (Array.isArray(list)) {
    for (const item of list as Array<Record<string, unknown>>) {
      if (typeof item.metric === "string" && typeof item.value === "number") {
        out[item.metric] = item.value;
      }
    }
  }
  return out;
}

function isThirdParty(host: string, url: string): boolean {
  try {
    const pageOrigin = new URL(url).hostname.replace(/^www\./, "");
    const reqHost = host || "";
    return !reqHost || !reqHost.includes(pageOrigin);
  } catch {
    return true;
  }
}

function findFirstView(rawResult: Record<string, unknown>): {
  meta: Record<string, unknown>;
  view: Record<string, unknown> | null;
} {
  const result: Record<string, unknown> = {};

  const testInfo = rawResult["testInfo"] as Record<string, unknown> | undefined;
  if (testInfo) {
    if (typeof testInfo.location === "string") result.location = testInfo.location;
    if (typeof testInfo.browser === "string") result.browser = testInfo.browser;
  }

  const view = firstView(rawResult);
  if (!view) {
    return { meta: result, view: null };
  }
  return { meta: result, view };
}

/** Parses raw WPT JSON into a normalized summary. */
export function parseWebPageTestResult(
  raw: unknown,
  testId: string,
  url: string
): WebPageTestSummary {
  const data = (raw ?? {}) as Record<string, unknown>;
  const { meta, view } = findFirstView(data);
  const viewObject = (view ?? {}) as Record<string, unknown>;

  const metricsMapData = metricsMap(viewObject);
  const metrics: Metric[] = [];

  const candidates: Array<{ keys: string[]; def: { id: MetricName; unit: MetricUnit }; label: string }> = [
    { keys: ["LCP", "largestContentfulPaint", "lcp"], def: { id: "LCP", unit: "ms" }, label: "LCP" },
    { keys: ["CLS", "cumulativeLayoutShift", "cls"], def: { id: "CLS", unit: "" }, label: "CLS" },
    { keys: ["FCP", "firstContentfulPaint", "fcp"], def: { id: "FCP", unit: "ms" }, label: "FCP" },
    { keys: ["TTFB", "timeToFirstByte", "ttfb", "TimeToFirstByte"], def: { id: "TTFB", unit: "ms" }, label: "TTFB" },
    { keys: ["TBT", "totalBlockingTime", "tbt"], def: { id: "TBT", unit: "ms" }, label: "TBT" },
    { keys: ["SI", "SpeedIndex", "si"], def: { id: "SI", unit: "ms" }, label: "Speed Index" }
  ];

  for (const c of candidates) {
    // 1) metrics table
    let value: number | null = null;
    for (const key of c.keys) {
      if (metricsMapData[key] !== undefined) {
        value = metricsMapData[key];
        break;
      }
    }
    if (value === null) {
      value = pickValue(viewObject, c.keys);
    }
    if (value !== null) {
      metrics.push(buildMetric(c.def.id, c.label, value, c.def.unit));
    }
  }

  const requestsRaw = Array.isArray(viewObject.requests)
    ? (viewObject.requests as unknown[])
    : [];
  const requests = (num(viewObject.requestsCount) ?? requestsRaw.length) as number;
  const bytes = (num(viewObject.bytesIn) ?? num(viewObject.bytes) ?? 0) as number;

  const topRequests: WebPageTestRequestEvidence[] = requestsRaw
    .map((r) => {
      const req = r as RequestEntry;
      const loadTime = num(req.loadTime) ?? 0;
      const bytesIn = num(req.bytesIn) ?? 0;
      const urlRaw = String(req.url ?? "");
      const host = String(req.host ?? "");
      return {
        url: urlRaw,
        host: host || (() => { try { return new URL(urlRaw).host; } catch { return "—"; } })(),
        contentType: String(req.contentType ?? req.type ?? "other"),
        startTime: num(req.startTime) ?? 0,
        loadTime,
        bytes: bytesIn,
        isThirdParty: isThirdParty(host, url)
      };
    })
    .sort((a, b) => b.loadTime - a.loadTime)
    .slice(0, 8);

  return {
    testId,
    status: "completed",
    metrics,
    requests: Number(requests) || 0,
    bytes: bytes || 0,
    topRequests,
    waterfallRef: `https://www.webpagetest.org/result/${testId}/`,
    analyzedAt: new Date().toISOString(),
    location: typeof meta.location === "string" ? meta.location : undefined,
    browser: typeof meta.browser === "string" ? meta.browser : undefined
  };
}