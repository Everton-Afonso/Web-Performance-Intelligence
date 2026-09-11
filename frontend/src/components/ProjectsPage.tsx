import { useEffect, useState } from "react";
import type { ProjectRecord } from "@/types/analysis";
import { listProjects, createProject, getProject, ApiRequestError } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "./LoadingState";
import { ErrorMessage } from "./ErrorMessage";

interface Props {
  onBack: () => void;
}

export function ProjectsPage({ onBack }: Props) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selected, setSelected] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao listar projetos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createProject(name.trim());
      setName("");
      setProjects(await listProjects());
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : "Falha ao criar projeto.");
    } finally {
      setCreating(false);
    }
  };

  const selectProject = async (id: string) => {
    setLoading(true);
    try {
      setSelected(await getProject(id));
    } catch {
      setError("Falha ao carregar projeto.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="projects-page">
      <div className="page__header">
        <button className="back-button" onClick={onBack}>{t("back")}</button>
        <h2>{t("projects.title")}</h2>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => { setError(null); setLoading(true); void loadProjects(); }} />}

      {!selected && (
        <>
          <ul className="sites__list">
            {projects.map((p) => (
              <li key={p.id} className="sites__item">
                <strong>{p.name}</strong>
                <button onClick={() => void selectProject(p.id)} className="sites__open">{t("projects.view")}</button>
              </li>
            ))}
          </ul>

          <form className="sites__form" onSubmit={handleCreate}>
            <h3>{t("projects.new")}</h3>
            <input className="analysis-form__input" value={name} placeholder={t("projects.name.placeholder")} onChange={(e) => setName(e.target.value)} disabled={creating} />
            {createError && <p className="analysis-form__error">{createError}</p>}
            <button type="submit" className="analysis-form__submit" disabled={creating}>{creating ? "..." : t("projects.create")}</button>
          </form>
        </>
      )}

      {selected && (
        <div>
          <button className="back-button" onClick={() => setSelected(null)}>{t("back")}</button>
          <h3>{selected.name}</h3>
          <p className="muted">Sites associados: {selected.sites?.length ?? 0}</p>
          <ul className="sites__list">
            {(selected.sites ?? []).map((s) => (
              <li key={s.id} className="sites__item">
                <div className="sites__info">
                  <strong className="sites__name">{s.name}</strong>
                  <span className="sites__url">{s.url}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}