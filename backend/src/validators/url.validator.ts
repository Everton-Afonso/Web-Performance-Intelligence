/**
 * Independent URL validation (RF-11 / RNF-04 / CA-01 / CA-02).
 *
 * Validation happens on both frontend and backend; the backend is the source
 * of truth and rejects invalid entries before any external call is made.
 */

const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export type UrlValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}

function normalize(value: string): string {
  return value.trim();
}

export function validateUrl(input: unknown): UrlValidationResult {
  if (typeof input !== "string") {
    return { ok: false, reason: "A URL deve ser uma string válida." };
  }

  const value = normalize(input);
  if (value.length === 0) {
    return { ok: false, reason: "Informe uma URL para análise." };
  }

  if (!URL_PATTERN.test(value)) {
    return {
      ok: false,
      reason: "Informe uma URL válida iniciada por http:// ou https://."
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      ok: false,
      reason: "Informe uma URL válida iniciada por http:// ou https://."
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: "A URL deve usar http:// ou https://."
    };
  }

  if (!parsed.hostname || parsed.hostname.includes(" ")) {
    return {
      ok: false,
      reason: "Informe uma URL válida com domínio."
    };
  }

  return { ok: true, value };
}

export function parseUrlOrThrow(input: unknown): string {
  const result = validateUrl(input);
  if (!result.ok) {
    throw new InvalidUrlError(result.reason);
  }
  return result.value;
}