import { Router } from "express";
import type { Repository } from "../types/storage.js";
import type { MonitoringScheduler } from "../services/monitoring/scheduler.js";
import { ProjectsController } from "../controllers/projects.controller.js";
import { MonitoringController } from "../controllers/monitoring.controller.js";
import { AlertsController } from "../controllers/alerts.controller.js";
import { GoalsController } from "../controllers/goals.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

export function createV4Router(
  repository: Repository,
  scheduler?: MonitoringScheduler
): Router {
  const router = Router();

  // Projects
  const projects = new ProjectsController(repository);
  router.get("/projects", asyncHandler(projects.list.bind(projects)));
  router.post("/projects", asyncHandler(projects.create.bind(projects)));
  router.get("/projects/:id", asyncHandler(projects.get.bind(projects)));

  // Monitoring
  const monitoring = new MonitoringController(repository, scheduler);
  router.get("/monitoring", asyncHandler(monitoring.list.bind(monitoring)));
  router.post("/monitoring", asyncHandler(monitoring.create.bind(monitoring)));
  router.post("/monitoring/:id/toggle", asyncHandler(monitoring.toggle.bind(monitoring)));
  router.post("/monitoring/:id/run", asyncHandler(monitoring.runNow.bind(monitoring)));
  router.delete("/monitoring/:id", asyncHandler(monitoring.remove.bind(monitoring)));

  // Alerts
  const alerts = new AlertsController(repository);
  router.get("/alerts", asyncHandler(alerts.list.bind(alerts)));
  router.get("/alerts/count", asyncHandler(alerts.count.bind(alerts)));
  router.post("/alerts/:id/read", asyncHandler(alerts.markRead.bind(alerts)));

  // Goals
  const goals = new GoalsController(repository);
  router.get("/sites/:siteId/goals", asyncHandler(goals.listBySite.bind(goals)));
  router.post("/goals", asyncHandler(goals.upsert.bind(goals)));
  router.delete("/sites/:siteId/goals/:goalId", asyncHandler(goals.remove.bind(goals)));

  return router;
}