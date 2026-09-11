import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCard } from "../src/components/MetricCard";
import type { Metric } from "../src/types/analysis";

const base: Metric = {
  id: "LCP",
  name: "Largest Contentful Paint",
  value: 3800,
  unit: "ms",
  status: null,
  displayValue: "3.8 s"
};

describe("MetricCard", () => {
  it("renderiza nome e valor", () => {
    render(<MetricCard metric={{ ...base, status: "needs-improvement" }} />);
    expect(screen.getByText("Largest Contentful Paint")).toBeInTheDocument();
    expect(screen.getByText("3.8 s")).toBeInTheDocument();
  });

  it("exibe estado bom", () => {
    render(
      <MetricCard
        metric={{
          id: "INP",
          name: "Interaction to Next Paint",
          value: 180,
          unit: "ms",
          status: "good",
          displayValue: "180 ms"
        }}
      />
    );
    expect(screen.getByText("180 ms")).toBeInTheDocument();
    expect(screen.getByText("Bom")).toBeInTheDocument();
  });

  it("exibe métrica indisponível quando valor nulo", () => {
    render(
      <MetricCard
        metric={{ id: "FCP", name: "FCP", value: null, unit: "ms", status: null, displayValue: "Não disponível" }}
      />
    );
    expect(screen.getAllByText("Não disponível").length).toBeGreaterThanOrEqual(1);
  });
});