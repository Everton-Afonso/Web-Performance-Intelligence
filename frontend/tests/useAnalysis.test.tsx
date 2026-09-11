import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAnalysis } from "../src/hooks/useAnalysis";
import type { AnalysisResult } from "../src/types/analysis";

vi.mock("../src/services/api", () => ({
  ApiRequestError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiRequestError";
      this.status = status;
    }
  },
  analyzeUrl: vi.fn(),
  getHealth: vi.fn()
}));

import { analyzeUrl } from "../src/services/api";

const result: AnalysisResult = {
  id: "id",
  requestedUrl: "https://meusite.com",
  finalUrl: "https://meusite.com",
  strategy: "mobile",
  analyzedAt: "2026-09-10T12:00:00.000Z",
  performanceScore: 90,
  metrics: [],
  audits: [],
  failedAuditsCount: 0,
  highImpactCount: 0,
  warnings: []
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAnalysis", () => {
  it("passa por loading e sucesso", async () => {
    vi.mocked(analyzeUrl).mockResolvedValue(result);
    const { result: hook } = renderHook(() => useAnalysis());

    let promise: Promise<void>;
    act(() => {
      promise = hook.current.run({ url: "https://meusite.com", strategy: "mobile" });
    });
    expect(hook.current.state.status).toBe("loading");

    await waitFor(async () => {
      await promise;
      expect(hook.current.state.status).toBe("success");
    });

    if (hook.current.state.status === "success") {
      expect(hook.current.state.result.performanceScore).toBe(90);
    }
  });

  it("registra erro com mensagem em falha", async () => {
    vi.mocked(analyzeUrl).mockRejectedValue(
      Object.assign(new Error("URL inválida"), { status: 400 })
    );
    const { result: hook } = renderHook(() => useAnalysis());

    await act(async () => {
      await hook.current.run({ url: "https://erro.com", strategy: "mobile" });
    });

    expect(hook.current.state.status).toBe("error");
    if (hook.current.state.status === "error") {
      expect(hook.current.state.message).toBe("URL inválida");
    }
  });

  it("não dispara análise duplicada enquanto processa (RF-12)", async () => {
    let resolveOuter: (value: AnalysisResult) => void = () => undefined;
    vi.mocked(analyzeUrl).mockImplementation(
      () => new Promise<AnalysisResult>((resolve) => (resolveOuter = resolve))
    );
    const { result: hook } = renderHook(() => useAnalysis());

    let first!: Promise<void>;
    act(() => {
      first = hook.current.run({ url: "https://site.com", strategy: "mobile" });
      void hook.current.run({ url: "https://site.com", strategy: "mobile" });
    });
    expect(analyzeUrl).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveOuter(result);
      await first;
    });
  });
});