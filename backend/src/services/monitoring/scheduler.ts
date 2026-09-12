/**
 * V4 — Monitoring scheduler.
 *
 * Periodically runs due monitors: triggers an analysis (which persists when a
 * repository is configured), then:
 * - compares with the previous analysis of the same site+strategy
 * - detects relevant regressions
 * - evaluates site goals
 * - creates alerts for both
 *
 * Guards against overlapping runs of the same monitor.
 */

import type { Repository, MonitorRecord } from "../../types/storage.js";
import type { AnalysisService } from "../analysis.service.js";
import { detectRegressions, evaluateGoals } from "../performance/regression.js";

export interface MonitoringSchedulerOptions {
  repository: Repository;
  analyzer: AnalysisService;
  now?: () => Date;
  tickIntervalMs?: number;
  onError?: (err: unknown, monitorId: string) => void;
}

export interface MonitorRunResult {
  monitorId: string;
  analysisId: string | null;
  alertsCreated: number;
  error?: string;
}

export class MonitoringScheduler {
  private readonly repository: Repository;
  private readonly analyzer: AnalysisService;
  private readonly now: () => Date;
  private readonly tickIntervalMs: number;
  private readonly onError?: (err: unknown, monitorId: string) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly running = new Set<string>();

  constructor(options: MonitoringSchedulerOptions) {
    this.repository = options.repository;
    this.analyzer = options.analyzer;
    this.now = options.now ?? (() => new Date());
    this.tickIntervalMs = options.tickIntervalMs ?? 60_000;
    this.onError = options.onError;
  }

  start(): void {
    this.stop();
    this.timer = setInterval(() => {
      void this.tick().catch((err) => console.error("[wpintel] monitor tick failed", err));
    }, this.tickIntervalMs);
    // First tick shortly after boot so newly created monitors run promptly.
    // Use an immediate tick guarded to avoid runaway on boot:
    void this.tick().catch((err) => this.onError?.(err, "boot"));
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Runs all due monitors; returns the number executed. */
  async tick(): Promise<number> {
    const now = this.now();
    const due = await this.repository.listDueMonitors(now);
    let executed = 0;
    for (const monitor of due) {
      if (this.running.has(monitor.id)) {
        continue;
      }
      executed += 1;
      const result = await this.runMonitor(monitor);
      if (result.error && this.onError) {
        this.onError(result.error, monitor.id);
      }
    }
    return executed;
  }

  /** Runs a single monitor immediately (also used by POST /api/monitoring/:id/run). */
  async runMonitor(monitor: MonitorRecord): Promise<MonitorRunResult> {
    if (!monitor.site) {
      return { monitorId: monitor.id, analysisId: null, alertsCreated: 0, error: "Monitor sem site associado." };
    }
    if (this.running.has(monitor.id)) {
      return { monitorId: monitor.id, analysisId: null, alertsCreated: 0, error: "Monitor já em execução." };
    }
    this.running.add(monitor.id);
    const startedAt = new Date();

    try {
      const now = this.now();
      const result = await this.analyzer.analyze({
        url: monitor.site.url,
        strategy: monitor.strategy
      });

      let alertsCreated = 0;
      const current = await this.repository.getAnalysisById(result.id);

      if (current) {
        // 1) Regression vs previous analysis
        const previous = await this.repository.getPreviousAnalysis(
          monitor.siteId,
          monitor.strategy,
          current.id
        );
        if (previous) {
          for (const finding of detectRegressions(previous, current)) {
            await this.repository.createAlert({
              siteId: monitor.siteId,
              type: "regression",
              metric: finding.metric,
              severity: finding.severity,
              message: finding.message,
              analysisId: current.id
            });
            alertsCreated += 1;
          }
        }

        // 2) Goals
        const goals = await this.repository.listGoalsBySite(monitor.siteId);
        if (goals.length > 0) {
          for (const evaluation of evaluateGoals(goals, current)) {
            if (!evaluation.met) {
              await this.repository.createAlert({
                siteId: monitor.siteId,
                type: "goal",
                metric: evaluation.metric,
                severity: "medium",
                message: evaluation.message,
                analysisId: current.id
              });
              alertsCreated += 1;
            }
          }
        }
      }

      const nextRunAt = new Date(now.getTime() + monitor.intervalHours * 3600 * 1000);
      await this.repository.updateMonitor(monitor.id, {
        enabled: undefined,
        lastRunAt: now.toISOString(),
        nextRunAt: nextRunAt.toISOString()
      });

      await this.repository.createMonitorRun({
        monitorId: monitor.id,
        status: "ok",
        analysisId: result.id,
        alertsCreated,
        message: alertsCreated > 0 ? `${alertsCreated} alerta(s) gerado(s)` : "Sem problemas detectados.",
        startedAt: startedAt.toISOString(),
        durationMs: Date.now() - startedAt.getTime()
      });

      return { monitorId: monitor.id, analysisId: result.id, alertsCreated };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Advance nextRunAt so a failing monitor does not retry every tick.
      const now = this.now();
      const nextRunAt = new Date(now.getTime() + monitor.intervalHours * 3600 * 1000);
      await this.repository.updateMonitor(monitor.id, {
        lastRunAt: now.toISOString(),
        nextRunAt: nextRunAt.toISOString()
      });
      await this.repository.createMonitorRun({
        monitorId: monitor.id,
        status: "error",
        message,
        startedAt: startedAt.toISOString(),
        durationMs: Date.now() - startedAt.getTime()
      });
      return { monitorId: monitor.id, analysisId: null, alertsCreated: 0, error: message };
    } finally {
      this.running.delete(monitor.id);
    }
  }
}