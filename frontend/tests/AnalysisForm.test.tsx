import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalysisForm } from "../src/components/AnalysisForm";

const mobileRadio = () => screen.getByRole("radio", { name: /^mobile$/i });
const desktopRadio = () => screen.getByRole("radio", { name: /^desktop$/i });
const bothRadio = () => screen.getByRole("radio", { name: "Mobile + Desktop" });

describe("AnalysisForm", () => {
  it("renderiza os campos de URL e estratégia", () => {
    render(<AnalysisForm busy={false} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/URL do site/i)).toBeInTheDocument();
    expect(mobileRadio()).toBeInTheDocument();
    expect(desktopRadio()).toBeInTheDocument();
    expect(bothRadio()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analisar/i })).toBeInTheDocument();
  });

  it("chama onSubmit com dados válidos", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AnalysisForm busy={false} onSubmit={onSubmit} />);

    const urlInput = screen.getByLabelText(/URL do site/i);
    await user.type(urlInput, "https://meusite.com");
    await user.click(screen.getByRole("button", { name: /analisar/i }));

    expect(onSubmit).toHaveBeenCalledWith("https://meusite.com", "mobile");
  });

  it("mostra erro para URL inválida e não chama onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AnalysisForm busy={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/URL do site/i), "invalida");
    await user.click(screen.getByRole("button", { name: /analisar/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("desabilita campos e botão quando busy", () => {
    render(<AnalysisForm busy={true} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/URL do site/i)).toBeDisabled();
    expect(mobileRadio()).toBeDisabled();
    expect(desktopRadio()).toBeDisabled();
    expect(screen.getByRole("button", { name: /analisando/i })).toBeDisabled();
  });

  it("permite selecionar Desktop", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AnalysisForm busy={false} onSubmit={onSubmit} />);

    await user.click(desktopRadio());
    await user.type(screen.getByLabelText(/URL do site/i), "https://site.com");
    await user.click(screen.getByRole("button", { name: /analisar/i }));

    expect(onSubmit).toHaveBeenCalledWith("https://site.com", "desktop");
  });

  it("permite selecionar Mobile + Desktop (both)", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AnalysisForm busy={false} onSubmit={onSubmit} />);

    await user.click(bothRadio());
    await user.type(screen.getByLabelText(/URL do site/i), "https://site.com");
    await user.click(screen.getByRole("button", { name: /analisar/i }));

    expect(onSubmit).toHaveBeenCalledWith("https://site.com", "both");
  });
});