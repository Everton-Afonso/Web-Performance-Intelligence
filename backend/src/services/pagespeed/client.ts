/**
 * HTTP client for the Google PageSpeed Insights v5 API (RF-03).
 *
 * The API key is injected server-side only (RNF-03 / CA-08). Without a key the
 * API still works under lower anonymous rate limits.
 */

import type { PageSpeedClientOptions, PageSpeedResponse } from "../../types/pagespeed.js";

export class PageSpeedClientError extends Error {
  readonly causeText: string;
  constructor(causeText: string) {
    super(`PageSpeed request failed: ${causeText}`);
    this.name = "PageSpeedClientError";
    this.causeText = causeText;
  }
}

export class PageSpeedHttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: string;
  /** Error status from the Google API error payload, e.g. FAILED_DOCUMENT_REQUEST */
  readonly apiStatus: string | null;
  readonly apiCode: number | null;
  readonly apiMessage: string | null;
  constructor(status: number, statusText: string, body: string) {
    super(`PageSpeed API returned HTTP ${status} ${statusText}`);
    this.name = "PageSpeedHttpError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.apiStatus = PageSpeedHttpError.parseBody(body).status;
    this.apiCode = PageSpeedHttpError.parseBody(body).code;
    this.apiMessage = PageSpeedHttpError.parseBody(body).message;
  }

  private static parseBody(body: string): {
    status: string | null;
    code: number | null;
    message: string | null;
  } {
    try {
      const parsed = JSON.parse(body) as {
        error?: { code?: number; status?: string; message?: string };
      };
      return {
        status: parsed.error?.status ?? null,
        code: parsed.error?.code ?? null,
        message: parsed.error?.message ?? null
      };
    } catch {
      return { status: null, code: null, message: null };
    }
  }
}

export class PageSpeedTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`PageSpeed request timed out after ${timeoutMs}ms`);
    this.name = "PageSpeedTimeoutError";
  }
}

export class PageSpeedService {
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: PageSpeedClientOptions) {
    this.apiUrl = options.apiUrl;
    this.apiKey = options.apiKey && options.apiKey.length > 0 ? options.apiKey : undefined;
    this.timeoutMs = options.timeoutMs ?? 60000;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private buildUrl(url: string, strategy: string): string {
    const parsed = new URL(this.apiUrl);
    parsed.searchParams.set("url", url);
    parsed.searchParams.set("strategy", strategy);
    parsed.searchParams.append("category", "performance");
    parsed.searchParams.append("category", "accessibility");
    parsed.searchParams.append("category", "best-practices");
    parsed.searchParams.append("category", "seo");
    if (this.apiKey) {
      parsed.searchParams.set("key", this.apiKey);
    }
    return parsed.toString();
  }

  async run(url: string, strategy: string): Promise<PageSpeedResponse> {
    if (typeof this.fetchFn !== "function") {
      throw new PageSpeedClientError("fetch is not available in this environment");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await this.fetchFn(this.buildUrl(url, strategy), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new PageSpeedTimeoutError(this.timeoutMs);
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new PageSpeedClientError(reason);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new PageSpeedHttpError(res.status, res.statusText, body);
    }

    const json: unknown = await res.json();
    if (!isPageSpeedResponse(json)) {
      throw new PageSpeedClientError("Resposta inválida da API PageSpeed");
    }
    return json;
  }
}

function isPageSpeedResponse(value: unknown): value is PageSpeedResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    ("lighthouseResult" in value || "error" in value || "id" in value)
  );
}