/**
 * WebPageTest API client (document v1.1).
 *
 * The WebPageTest API is a Pro-plan feature; the integration is encapsulated so
 * the product can control quota/usage and is only enabled when a valid key is
 * configured (RF-26). Without a key the service reports as disabled (RF-24).
 */

import type { WebPageTestDispatch } from "../../types/webpagetest.js";
import type { Strategy } from "../../types/analysis.js";

export interface WebPageTestClientOptions {
  apiKey?: string;
  /** Base URL used to dispatch tests: <base>/runtest.php */
  apiUrl?: string;
  /** Result poll base: <base>/jsonResult.php?test=<id> */
  resultUrl?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  fetchFn?: typeof fetch;
}

export class WebPageTestError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "WebPageTestError";
    this.status = status;
  }
}

export class WebPageTestAuthError extends Error {
  constructor() {
    super("Auth do WebPageTest inválida. Verifique WEBPAGETEST_API_KEY.");
    this.name = "WebPageTestAuthError";
  }
}

export class WebPageTestTimeoutError extends Error {
  readonly testId: string;
  constructor(testId: string) {
    super(`WebPageTest não concluiu o teste ${testId} dentro do prazo.`);
    this.name = "WebPageTestTimeoutError";
    this.testId = testId;
  }
}

interface DispatchResponse {
  statusCode?: number;
  data?: { testId?: string; jsonUrl?: string; url?: string };
  statusText?: string;
  error?: string;
}

interface ResultResponse {
  statusCode?: number;
  statusText?: string;
  data?: Record<string, unknown>;
}

const LOCATION_BY_STRATEGY: Record<Strategy, string> = {
  mobile: "Dulles_MotoG4",
  desktop: "Dulles_Chrome"
};

export class WebPageTestService {
  private readonly apiKey?: string;
  private readonly dispatchUrl: string;
  private readonly resultUrl: string;
  private readonly timeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: WebPageTestClientOptions = {}) {
    const base = options.apiUrl ?? "https://www.webpagetest.org";
    this.apiKey = options.apiKey && options.apiKey.length > 0 ? options.apiKey : undefined;
    this.dispatchUrl = `${base}/runtest.php`;
    this.resultUrl = options.resultUrl ?? `${base}/jsonResult.php`;
    this.timeoutMs = options.timeoutMs ?? 180_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 5000;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  /** Integration is only available when a key is configured. */
  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async dispatch(url: string, strategy: Strategy): Promise<WebPageTestDispatch> {
    if (!this.apiKey) {
      throw new WebPageTestError("WebPageTest não habilitado: configure WEBPAGETEST_API_KEY no backend.", 503);
    }

    const target = new URL(this.dispatchUrl);
    target.searchParams.set("url", url);
    target.searchParams.set("k", this.apiKey);
    target.searchParams.set("location", LOCATION_BY_STRATEGY[strategy]);
    target.searchParams.set("runs", "1");
    target.searchParams.set("f", "json");
    target.searchParams.set("video", "0");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchFn(target.toString(), { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new WebPageTestTimeoutError("dispatch");
      }
      throw new WebPageTestError("Falha de rede ao falar com o WebPageTest.", 502);
    } finally {
      clearTimeout(timer);
    }

    const body = (await res.json()) as DispatchResponse;
    const code = body.statusCode ?? 0;

    // Status codes: 100 = finished/cached, 101 = running, 200 = test created.
    if (code === 401 || code === 403 || code === 400) {
      throw new WebPageTestAuthError();
    }
    if (code !== 100 && code !== 101 && code !== 200) {
      if (body.statusText?.toLowerCase().includes("api") && body.statusText?.toLowerCase().includes("key")) {
        throw new WebPageTestAuthError();
      }
      throw new WebPageTestError(body.statusText ?? "Falha ao criar o teste no WebPageTest.", res.status);
    }
    if (!body.data?.testId) {
      throw new WebPageTestError("Resposta inválida do WebPageTest (sem testId).");
    }

    return {
      testId: body.data.testId,
      jsonUrl: body.data.jsonUrl ?? `${this.resultUrl}?test=${encodeURIComponent(body.data.testId)}`
    };
  }

  /**
   * Polls the test result until it completes (statusCode 200) or the timeout is
   * reached. Returns the full WPT result payload.
   */
  async waitForResult(
    testId: string,
    jsonUrl?: string,
    maxWaitMs?: number,
    now?: () => number
  ): Promise<Record<string, unknown>> {
    const url = jsonUrl ?? `${this.resultUrl}?test=${encodeURIComponent(testId)}`;
    const deadline = (now ?? Date.now)() + (maxWaitMs ?? this.timeoutMs);

    while (true) {
      const res = await this.fetchFn(url);
      if (!res.ok) {
        throw new WebPageTestError(`Falha ao consultar o resultado do WebPageTest (HTTP ${res.status}).`, res.status);
      }
      const body = (await res.json()) as ResultResponse;

      if (body.statusCode === 200) {
        return body.data ?? {};
      }
      if (body.statusCode === 400 && body.statusText?.toLowerCase().includes("invalid")) {
        throw new WebPageTestError(`Teste inválido: ${body.statusText}`);
      }
      if ((now ?? Date.now)() >= deadline) {
        throw new WebPageTestTimeoutError(testId);
      }
      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
  }
}