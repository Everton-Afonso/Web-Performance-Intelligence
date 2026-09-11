import { Router } from "express";
import type { Repository } from "../types/storage.js";
import { ReportController } from "../controllers/report.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

export function createReportRouter(repository: Repository): Router {
  const controller = new ReportController(repository);
  const router = Router();
  router.post("/reports/:id", asyncHandler(controller.generate.bind(controller)));
  return router;
}