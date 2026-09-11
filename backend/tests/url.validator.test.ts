import { describe, expect, it } from "vitest";
import { validateUrl, parseUrlOrThrow, InvalidUrlError } from "../src/validators/url.validator.js";

describe("validateUrl", () => {
  it.each([
    ["https://meusite.com", true],
    ["http://meusite.com", true],
    ["https://sub.dominio.com.br/path?q=1", true],
    ["https://meusite.com:8443/pagina", true],
    ["https://192.168.0.1", true],
    ["https://localhost:3000", true],
    ["  https://meusite.com  ", true]
  ])("aceita %s", (input) => {
    const result = validateUrl(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(input.trim());
    }
  });

  it.each([
    ["", "nenhuma URL"],
    ["   ", "espaços"],
    ["notaurl", "texto qualquer"],
    ["ftp://servidor.com", "protocolo ftp"],
    ["javascript:alert(1)", "protocolo javascript"],
    ["www.meusite.com", "sem protocolo"],
    ["meusite.com", "domínio sem protocolo"],
    [null, "null"],
    [undefined, "undefined"],
    [12345, "número"]
  ])("rejeita %s (%s)", (input) => {
    const result = validateUrl(input);
    expect(result.ok).toBe(false);
  });
});

describe("parseUrlOrThrow", () => {
  it("retorna a url normalizada", () => {
    expect(parseUrlOrThrow("  https://meusite.com  ")).toBe("https://meusite.com");
  });

  it("lança InvalidUrlError para entrada inválida", () => {
    expect(() => parseUrlOrThrow("invalida")).toThrow(InvalidUrlError);
  });
});