import { Router } from "express";
import { healthHandler } from "../controllers/health.controller.js";

export function createHealthRouter(): Router {
  const router = Router();
  router.get("/health", healthHandler);
  return router;
}