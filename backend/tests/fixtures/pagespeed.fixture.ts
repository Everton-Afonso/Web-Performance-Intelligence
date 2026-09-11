import type { PageSpeedResponse } from "../../src/types/pagespeed.js";

/**
 * Realistic PageSpeed Insights v5 payload subset used across tests.
 * Mirrors the structure consumed by the parser (RF-13/CA-04/CA-05).
 */
export const psiFixture: PageSpeedResponse = {
  id: "https://meusite.com::mobile::00000000-0000-0000-0000-000000000000",
  lighthouseResult: {
    requestedUrl: "https://meusite.com",
    finalUrl: "https://meusite.com/pt-br",
    fetchTime: "2026-09-10T12:00:00.000Z",
    lighthouseVersion: "12.4.0",
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    categories: {
      performance: { id: "performance", title: "Performance", score: 0.67 }
    },
    audits: {
      "largest-contentful-paint": {
        id: "largest-contentful-paint",
        title: "Largest Contentful Paint",
        description: "Tempo do maior elemento visível.",
        score: 0,
        scoreDisplayMode: "numeric",
        numericValue: 3800,
        displayValue: "3.8 s"
      },
      "interaction-to-next-paint": {
        id: "interaction-to-next-paint",
        title: "Interaction to Next Paint",
        description: "Capacidade de resposta a interações.",
        score: 1,
        scoreDisplayMode: "numeric",
        numericValue: 180,
        displayValue: "180 ms"
      },
      "cumulative-layout-shift": {
        id: "cumulative-layout-shift",
        title: "Cumulative Layout Shift",
        description: "Estabilidade visual.",
        score: 0,
        scoreDisplayMode: "numeric",
        numericValue: 0.31,
        displayValue: "0.31"
      },
      "first-contentful-paint": {
        id: "first-contentful-paint",
        title: "First Contentful Paint",
        description: "Primeiro conteúdo renderizado.",
        score: 0,
        scoreDisplayMode: "numeric",
        numericValue: 2100,
        displayValue: "2.1 s"
      },
      "server-response-time": {
        id: "server-response-time",
        title: "Initial server response time",
        description: "Tempo até o primeiro byte.",
        score: 0,
        scoreDisplayMode: "numeric",
        numericValue: 1200,
        displayValue: "Root document took 1,200 ms"
      },
      "total-blocking-time": {
        id: "total-blocking-time",
        title: "Total Blocking Time",
        description: "Tempo de bloqueio total.",
        score: 0,
        scoreDisplayMode: "numeric",
        numericValue: 450,
        displayValue: "450 ms"
      },
      "speed-index": {
        id: "speed-index",
        title: "Speed Index",
        description: "Índice de velocidade.",
        score: 0.5,
        scoreDisplayMode: "numeric",
        numericValue: 4200,
        displayValue: "4.2 s"
      },
      "unsized-images": {
        id: "unsized-images",
        title: "Image elements do not have explicit width and height",
        description: "Imagens sem dimensões explícitas podem causar CLS.",
        score: 0,
        scoreDisplayMode: "binary",
        numericValue: 12,
        displayValue: "12 images found"
      },
      "render-blocking-resources": {
        id: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        description: "Recursos que bloqueiam a renderização.",
        score: 0.2,
        scoreDisplayMode: "numeric",
        numericValue: 240,
        displayValue: "2 resources found"
      },
      "offscreen-images": {
        id: "offscreen-images",
        title: "Defer offscreen images",
        description: "Adiar imagens fora da tela.",
        score: 0,
        scoreDisplayMode: "binary",
        numericValue: 3,
        displayValue: "3 images found"
      },
      "canonical": {
        id: "canonical",
        title: "Document has a valid canonical link",
        description: "Canonical válido.",
        score: 1,
        scoreDisplayMode: "binary"
      },
      "unused-css-rules": {
        id: "unused-css-rules",
        title: "Remove unused CSS",
        description: "CSS não utilizado.",
        score: null,
        scoreDisplayMode: "error",
        numericValue: 0,
        displayValue: "No CSS rules found"
      }
    }
  },
  loadingExperience: {},
  analysisUTCTimestamp: "2026-09-10T12:00:00.000Z"
};

export const psiErrorFixture: PageSpeedResponse = {
  error: {
    code: 400,
    message: "Lighthouse returned an error or could not provide information. Please try again as this may be temporary."
  }
};

export const psiFailDocumentFixture: PageSpeedResponse = {
  error: {
    code: 500,
    status: "FAILED_DOCUMENT_REQUEST"
  }
};