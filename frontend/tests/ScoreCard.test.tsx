import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreCard } from "../src/components/ScoreCard";

describe("ScoreCard", () => {
  it("renderiza score numérico e status", () => {
    render(<ScoreCard score={67} />);
    expect(screen.getByText("67")).toBeInTheDocument();
    expect(screen.getByText("Precisa melhorar")).toBeInTheDocument();
  });

  it("exibe 'Bom' para score >= 90", () => {
    render(<ScoreCard score={95} />);
    expect(screen.getByText("Bom")).toBeInTheDocument();
  });

  it("exibe 'Ruim' para score < 50", () => {
    render(<ScoreCard score={20} />);
    expect(screen.getByText("Ruim")).toBeInTheDocument();
  });

  it("lida com score nulo", () => {
    render(<ScoreCard score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Não disponível")).toBeInTheDocument();
  });
});