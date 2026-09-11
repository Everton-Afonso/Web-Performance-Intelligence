import { useEffect, useState } from "react";
import type { GoalRecord, GoalOperator, MetricName } from "@/types/analysis";
import { listGoalsBySite, upsertGoal, deleteGoal, ApiRequestError } from "@/services/api";
import { useI18n } from "@/i18n";

interface Props {
  siteId: string;
}

const METRIC_OPTIONS: { id: MetricName; label: string }[] = [
  { id: "LCP", label: "LCP" },
  { id: "INP", label: "INP" },
  { id: "CLS", label: "CLS" },
  { id: "FCP", label: "FCP" },
  { id: "TTFB", label: "TTFB" },
  { id: "TBT", label: "TBT" },
  { id: "SI", label: "Speed Index" },
  { id: "performance-score", label: "Performance" }
];

export function GoalsPanel({ siteId }: Props) {
  const { t } = useI18n();
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [metric, setMetric] = useState<MetricName>("LCP");
  const [target, setTarget] = useState<string>("2500");
  const [operator, setOperator] = useState<GoalOperator>("lte");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setGoals(await listGoalsBySite(siteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar metas.");
    }
  };

  useEffect(() => {
    void load();
  }, [siteId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await upsertGoal(siteId, metric, parseFloat(target), operator);
      setGoals(await listGoalsBySite(siteId));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Falha ao criar meta.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    await deleteGoal(siteId, goalId);
    void load();
  };

  return (
    <section className="goals">
      <h3>{t("goals.title")}</h3>
      {error && <p className="analysis-form__error">{error}</p>}

      {goals.length === 0 ? (
        <p className="muted">{t("goals.empty")}</p>
      ) : (
        <ul className="audit-list">
          {goals.map((g) => (
            <li key={g.id} className="audit-item audit-item--p1">
              <div className="audit-item__content">
                <strong>{g.metric}</strong> {t(`goals.operator.${g.operator}`)} {g.target}
                <span className="history-actions" style={{ marginLeft: 12 }}>
                  <button onClick={() => void handleDelete(g.id)}>{t("goals.delete")}</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="sites__form" onSubmit={handleCreate}>
        <h4>{t("goals.form.submit")}</h4>
        <div className="analysis-form__options" style={{ gap: 8 }}>
          <label className="analysis-form__option">
            <select className="analysis-form__input" value={metric} onChange={(e) => setMetric(e.target.value as MetricName)} disabled={creating}>
              {METRIC_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="analysis-form__option">
            <select className="analysis-form__input" value={operator} onChange={(e) => setOperator(e.target.value as GoalOperator)} disabled={creating}>
              <option value="lte">≤</option>
              <option value="gte">≥</option>
            </select>
          </label>
          <input className="analysis-form__input" type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} disabled={creating} />
        </div>
        <button type="submit" className="analysis-form__submit" disabled={creating}>{t("goals.form.submit")}</button>
      </form>
    </section>
  );
}