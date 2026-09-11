import type { AnalysisResult, HealthResponse, Strategy } from "@/types/analysis";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.") {
    super(message);
    this.name = "NetworkError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (typeof body.error === "string" && body.error.length > 0) {
      return body.error;
    }
  } catch {
    // ignore malformed body
  }
  return `Erro ${res.status} ao executar a solicitação.`;
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init
    });
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) {
    throw new ApiRequestError(res.status, await parseError(res));
  }

  return (await res.json()) as T;
}

export function analyzeUrl(url: string, strategy: Strategy): Promise<AnalysisResult> {
  return fetchJson<AnalysisResult>("/analyze", {
    method: "POST",
    body: JSON.stringify({ url, strategy })
  });
}

export function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health", { method: "GET" });
}

export { API_BASE };