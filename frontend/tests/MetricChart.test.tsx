import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricChart } from "../src/components/MetricChart";

describe("MetricChart", () => {
  it("renderiza título e resumo da evolução", () => {
    render(
      <MetricChart
        title="Performance"
        points={[
          { label: "01/09", value: 50 },
          { label: "05/09", value: 70 },
          { label: "10/09", value: 85 }
        ]}
      />
    );
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText(/tendência de alta/i)).toBeInTheDocument();
  });

  it("mostra mensagem quando não há dados", () => {
    render(
      <MetricChart
        title="CLS"
        points={[
          { label: "a", value: null },
          { label: "b", value: null }
        ]}
      />
    );
    expect(screen.getByText(/não há dados suficientes/i)).toBeInTheDocument();
  });
});