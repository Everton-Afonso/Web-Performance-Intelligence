import { describe, expect, it, vi } from "vitest";
import {
  PageSpeedClientError,
  PageSpeedHttpError,
  PageSpeedService,
  PageSpeedTimeoutError
} from "../src/services/pagespeed/client.js";
import { psiFixture } from "./fixtures/pagespeed.fixture.js";

function jsonResponse(body: unknown, init: Partial<Response> = {}) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
    ...init
  } as unknown as Response;
}

describe("PageSpeedService", () => {
  it("monta a URL com url, strategy e categorias (RF-03)", async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const parsed = new URL(String(url));
      expect(parsed.searchParams.get("url")).toBe("https://meusite.com");
      expect(parsed.searchParams.get("strategy")).toBe("mobile");
      expect(parsed.searchParams.getAll("category")).toContain("performance");
      return jsonResponse({ id: "test" });
    });

    const client = new PageSpeedService({
      apiUrl: "https://api.test/pagespeed",
      fetchFn
    });

    await client.run("https://meusite.com", "mobile");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("injeta a chave de API no query da requisição (apenas backend)", async () => {
    const fetchFn = vi.fn(async (url: string) => {
      const parsed = new URL(String(url));
      expect(parsed.searchParams.get("key")).toBe("secret-key");
      return jsonResponse({ id: "test" });
    });

    const client = new PageSpeedService({
      apiUrl: "https://api.test/pagespeed",
      apiKey: "secret-key",
      fetchFn
    });

    await client.run("https://meusite.com", "desktop");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("não injeta chave quando ausente", async () => {
    let captured = "";
    const fetchFn = vi.fn(async (url: string) => {
      captured = String(url);
      return jsonResponse({ id: "test" });
    });

    const client = new PageSpeedService({
      apiUrl: "https://api.test/pagespeed",
      fetchFn
    });

    await client.run("https://meusite.com", "mobile");
    expect(new URL(captured).searchParams.has("key")).toBe(false);
  });

  it("lança PageSpeedHttpError para resposta não-ok", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, { ok: false, status: 500, statusText: "Internal" }));
    const client = new PageSpeedService({ apiUrl: "https://api.test", fetchFn });
    await expect(client.run("https://meusite.com", "mobile")).rejects.toBeInstanceOf(PageSpeedHttpError);
  });

  it("lança PageSpeedClientError para payload inválido", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ unexpected: true }));
    const client = new PageSpeedService({ apiUrl: "https://api.test", fetchFn });
    await expect(client.run("https://meusite.com", "mobile")).rejects.toBeInstanceOf(PageSpeedClientError);
  });

  it("lança PageSpeedTimeoutError quando a requisição estoura o prazo", async () => {
    const fetchFn = vi.fn((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("This operation was aborted") as Error & { name: string };
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const client = new PageSpeedService({
      apiUrl: "https://api.test",
      timeoutMs: 20,
      fetchFn
    });
    await expect(client.run("https://meusite.com", "mobile")).rejects.toBeInstanceOf(PageSpeedTimeoutError);
  });

  it("entrega a resposta PSI válida", async () => {
    const fetchFn = vi.fn(async () => jsonResponse(psiFixture));
    const client = new PageSpeedService({ apiUrl: "https://api.test", fetchFn });
    const result = await client.run("https://meusite.com", "mobile");
    expect(result.lighthouseResult?.categories?.performance?.score).toBe(0.67);
  });
});