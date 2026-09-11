import { Router } from "express";
import type { Repository } from "../types/storage.js";
import { SitesController } from "../controllers/sites.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

export function createSitesRouter(repository: Repository): Router {
  const controller = new SitesController(repository);
  const router = Router();
  router.get("/sites", asyncHandler(controller.listSites.bind(controller)));
  router.post("/sites", asyncHandler(controller.createSite.bind(controller)));
  router.get("/sites/:id", asyncHandler(controller.getSite.bind(controller)));
  router.get("/sites/:id/analyses", asyncHandler(controller.getSiteAnalyses.bind(controller)));
  router.get("/analyses/:id", asyncHandler(controller.getAnalysis.bind(controller)));
  return router;
}