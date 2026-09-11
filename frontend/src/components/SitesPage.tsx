import { useEffect, useState } from "react";
import type { SiteRecord } from "@/types/analysis";
import { listSites, createSite, ApiRequestError } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "./LoadingState";
import { ErrorMessage } from "./ErrorMessage";

interface SitesPageProps {
  onSelectSite: (siteId: string) => void;
  onBack: () => void;
}

export function SitesPage({ onSelectSite, onBack }: SitesPageProps) {
  const { t } = useI18n();
  const [sites, setSites] = useState<SiteRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const loadSites = async () => {
    try {
      const data = await listSites();
      setSites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar sites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSites();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setCreateError("Preencha nome e URL.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      await createSite(name.trim(), url.trim());
      setCreateSuccess(t("sites.created"));
      setName("");
      setUrl("");
      const data = await listSites();
      setSites(data);
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : "Falha ao cadastrar site.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="sites">
      <div className="page__header">
        <button className="back-button" onClick={onBack}>{t("back")}</button>
        <h2>{t("sites.title")}</h2>
      </div>

      {error ? (
        <ErrorMessage message={error} onRetry={() => { setLoading(true); setError(null); void loadSites(); }} />
      ) : (
        <>
          {sites && sites.length === 0 && <p>{t("sites.empty")}</p>}

          {sites && sites.length > 0 && (
            <ul className="sites__list">
              {sites.map((site) => (
                <li key={site.id} className="sites__item">
                  <div className="sites__info">
                    <strong className="sites__name">{site.name}</strong>
                    <span className="sites__url">{site.url}</span>
                  </div>
                  <button className="sites__open" onClick={() => onSelectSite(site.id)}>
                    {t("sites.open")}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="sites__form" onSubmit={handleSubmit}>
            <h3>{t("sites.form.submit")}</h3>
            <div className="analysis-form__field">
              <label htmlFor="site-name">{t("sites.form.name")}</label>
              <input id="site-name" value={name} placeholder={t("sites.form.name.placeholder")} onChange={(e) => setName(e.target.value)} disabled={creating} />
            </div>
            <div className="analysis-form__field">
              <label htmlFor="site-url">{t("sites.form.url")}</label>
              <input id="site-url" type="url" value={url} placeholder="https://meusite.com" onChange={(e) => setUrl(e.target.value)} disabled={creating} />
            </div>
            {createError && <p className="analysis-form__error">{createError}</p>}
            {createSuccess && <p className="sites__success">{createSuccess}</p>}
            <button type="submit" className="analysis-form__submit" disabled={creating}>
              {creating ? "..." : t("sites.form.submit")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}