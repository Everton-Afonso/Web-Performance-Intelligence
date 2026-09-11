import { Router } from "express";
import type { Repository } from "../types/storage.js";
import { CompareController } from "../controllers/compare.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

export function createCompareRouter(repository: Repository): Router {
  const controller = new CompareController(repository);
  const router = Router();
  router.post("/analyses/:id/compare", asyncHandler(controller.compare.bind(controller)));
  return router;
}