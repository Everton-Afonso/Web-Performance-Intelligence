import { useState } from "react";
import { useI18n, persistLocale, type Locale } from "@/i18n";
import { SectionHeader } from "@/components/ui";

export default function SettingsPage() {
  const { t } = useI18n();
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const v = localStorage.getItem("wpintel:locale");
      return v === "en-US" ? "en-US" : "pt-BR";
    } catch {
      return "pt-BR";
    }
  });

  const changeLocale = (l: Locale) => {
    setLocale(l);
    persistLocale(l);
  };

  return (
    <div className="page-inner">
      <SectionHeader title={t("nav.settings")} subtitle="Product, integrations and preferences" />

      <div className="feature-grid">
        <section className="panel">
          <h3>Idioma / Language</h3>
          <div className="ov-check">
            <label>
              <input type="radio" name="locale" checked={locale === "pt-BR"} onChange={() => changeLocale("pt-BR")} />
              Português (Brasil)
            </label>
            <label>
              <input type="radio" name="locale" checked={locale === "en-US"} onChange={() => changeLocale("en-US")} />
              English (US)
            </label>
          </div>
        </section>

        <section className="panel">
          <h3>Integrations</h3>
          <ul className="integrations">
            <li><b>PageSpeed / Lighthouse</b><span className="status-pill status-pill--good">Lab</span></li>
            <li><b>CrUX</b><span className="status-pill status-pill--good">Field</span></li>
            <li><b>WebPageTest</b><span className="status-pill status-pill--warn">Pro / API key</span></li>
          </ul>
          <p className="muted small">
            As chaves são gerenciadas exclusivamente no backend (variáveis de ambiente). Esta tela não exibe nem
            armazena segredos.
          </p>
        </section>

        <section className="panel">
          <h3>Data & retention</h3>
          <p className="muted small">
            Análises, histórico, comparações, monitoramento, alertas, metas e recomendações são persistidos no
            PostgreSQL. O cache em memória (5 min) evita análises duplicadas (RNF-14).
          </p>
        </section>
      </div>
    </div>
  );
}