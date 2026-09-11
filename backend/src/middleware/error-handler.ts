/**
 * Centralized error handling (RF-09 / RF-18 / RNF-05 / RNF-06).
 * Errors are logged server-side; the payload never leaks secrets or stack
 * traces.
 */

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { InvalidUrlError } from "../validators/url.validator.js";
import { PageSpeedRequestError } from "../services/analysis.service.js";
import {
  PageSpeedClientError,
  PageSpeedHttpError,
  PageSpeedTimeoutError
} from "../services/pagespeed/client.js";

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Rota não encontrada." });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const first = err.errors[0];
    res.status(400).json({ error: first?.message ?? "Entrada inválida." });
    return;
  }

  if (err instanceof InvalidUrlError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof PageSpeedRequestError) {
    res.status(err.status ?? 502).json({ error: err.message });
    return;
  }

  if (err instanceof PageSpeedTimeoutError) {
    res.status(504).json({
      error: "A análise demorou mais que o esperado. Tente novamente."
    });
    return;
  }

  if (err instanceof PageSpeedHttpError) {
    const rateLimited =
      err.status === 429 ||
      (err.apiStatus ?? "").includes("RATE_LIMIT") ||
      (err.apiStatus ?? "").includes("QUOTA") ||
      /quota|limit/i.test(err.apiMessage ?? "");
    if (rateLimited) {
      res.status(429).json({
        error: "Limite de requisições excedido na API PageSpeed. Aguarde um instante e tente novamente."
      });
      return;
    }
    if (err.status === 400) {
      // The page itself failed to render/be fetched.
      res.status(502).json({
        error:
          err.apiStatus === "FAILED_DOCUMENT_REQUEST"
            ? "Não foi possível acessar a página informada. Ela pode estar fora do ar, exigir login ou bloquear rastreadores."
            : "A URL informada não pôde ser analisada. Verifique se ela está acessível publicamente."
      });
      return;
    }
    if (err.status === 403) {
      res.status(502).json({
        error: "Acesso negado pelo PageSpeed. Verifique a chave de API no backend."
      });
      return;
    }
    if (err.status === 429) {
      res.status(429).json({
        error: "Limite de requisições excedido na API PageSpeed. Tente novamente em instantes."
      });
      return;
    }
    if (err.status >= 500) {
      res.status(502).json({
        error: "O serviço PageSpeed está temporariamente indisponível. Tente novamente em instantes."
      });
      return;
    }
    res.status(502).json({
      error: "Falha ao comunicar com o serviço PageSpeed. Tente novamente."
    });
    return;
  }

  if (err instanceof PageSpeedClientError || err instanceof TypeError) {
    res.status(502).json({
      error: "Falha de rede ao comunicar com o serviço PageSpeed. Verifique sua conexão e tente novamente."
    });
    return;
  }

  // Logs the cause server-side only; the response never exposes internals.
  console.error("[error]", err instanceof Error ? err.stack ?? err.message : String(err));
  res.status(500).json({ error: "Erro interno inesperado. Tente novamente." });
}