import { Router } from "express";
import type { Repository } from "../types/storage.js";
import type { WebPageTestService } from "../services/webpagetest/client.js";
import { WebPageTestController } from "../controllers/webpagetest.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

export function createWebPageTestRouter(
  repository: Repository,
  service?: WebPageTestService
): Router {
  const controller = new WebPageTestController(repository, service);
  const router = Router();
  router.post("/analyses/:id/webpagetest", asyncHandler(controller.run.bind(controller)));
  router.get("/analyses/:id/webpagetest", asyncHandler(controller.poll.bind(controller)));
  return router;
}