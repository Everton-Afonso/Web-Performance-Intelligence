import { useEffect, useState } from "react";
import type { AnalysisResult, GoalRecord, SiteRecord } from "@/types/analysis";
import { listSites, getSiteAnalyses, getAnalysisById, listGoalsBySite } from "@/services/api";
import { useI18n } from "@/i18n";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState, GoalBar, SectionHeader } from "@/components/ui";

export function GoalsPage() {
  const { t } = useI18n();
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [goals, setGoals] = useState<Record<string, GoalRecord[]>>({});
  const [latest, setLatest] = useState<Record<string, AnalysisResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const s = await listSites();
        setSites(s);
        const goalMap: Record<string, GoalRecord[]> = {};
        const latestMap: Record<string, AnalysisResult | null> = {};
        for (const site of s) {
          goalMap[site.id] = await listGoalsBySite(site.id);
          const { analyses } = await getSiteAnalyses(site.id, { limit: 1 });
          latestMap[site.id] = analyses[0] ? await getAnalysisById(analyses[0].id) : null;
        }
        setGoals(goalMap);
        setLatest(latestMap);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState />;

  const sitesWithGoals = sites.filter((s) => (goals[s.id] ?? []).length > 0);

  return (
    <div className="page-inner">
      <SectionHeader title={t("goals.title")} subtitle="Targets per site and current status" />

      {sitesWithGoals.length === 0 ? (
        <EmptyState title={t("goals.empty")} hint="Adicione metas em um site (detalhe do site → Metas) para começar." />
      ) : (
        <div className="ov-goals ov-goals--sites">
          {sitesWithGoals.map((site) => {
            const rec = latest[site.id];
            return (
              <section key={site.id} className="panel">
                <h3>{site.name}</h3>
                {rec === null && <p className="muted">Sem análise disponível para avaliar as metas.</p>}
                {goals[site.id]?.map((g) => {
                  const v = rec?.metrics.find((m) => m.id === g.metric)?.value ?? null;
                  const met = v !== null && (g.operator === "lte" ? v <= g.target : v >= g.target);
                  return <GoalBar key={g.id} label={g.metric} value={v ?? 0} target={g.target} achieved={met} />;
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}