import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecommendationsPanel } from "../src/components/RecommendationsPanel";
import type { Recommendation } from "../src/types/analysis";

const recommendations: Recommendation[] = [
  {
    targetType: "audit",
    targetId: "unsized-images",
    category: "CLS",
    priority: "P0",
    title: "Imagens sem dimensões reservadas",
    description: "Elemento visual inserido sem espaço reservado.",
    cause: "Causa provável: banner carregado após o conteúdo inicial.",
    recommendedFix: "Definir width/height ou aspect-ratio no container.",
    expectedImpact: "high",
    suggestedFix: '<img width="1280" height="720" />',
    evidence: ["unsized-images", "Valor identificado: 12 images"]
  },
  {
    targetType: "metric",
    targetId: "TTFB",
    category: "servidor",
    priority: "P2",
    title: "TTFB elevado",
    description: "Primeiro byte demora.",
    cause: "Causa provável: cache ausente.",
    recommendedFix: "Ative cache.",
    expectedImpact: "medium",
    evidence: []
  }
];

describe("RecommendationsPanel", () => {
  it("renderiza título, causa, recomendação, evidências e código", () => {
    render(<RecommendationsPanel recommendations={recommendations} />);

    expect(screen.getByText("Diagnóstico e recomendações")).toBeInTheDocument();
    expect(screen.getByText("Imagens sem dimensões reservadas")).toBeInTheDocument();
    expect(screen.getAllByText(/Causa provável:/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Definir width\/height ou aspect-ratio/i)).toBeInTheDocument();
    expect(screen.getByText(/banner carregado após o conteúdo inicial/i)).toBeInTheDocument();
    expect(screen.getByTestId("rec-code").textContent).toContain('width="1280"');
    expect(screen.getByText("unsized-images")).toBeInTheDocument();
  });

  it("exibe prioridades P0 e impacto", () => {
    render(<RecommendationsPanel recommendations={recommendations} />);
    expect(screen.getAllByText(/P0/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Impacto esperado: Alto")).toBeInTheDocument();
  });

  it("retorna null quando não há recomendações", () => {
    const { container } = render(<RecommendationsPanel recommendations={[]} />);
    expect(container.firstChild).toBeNull();
  });
});