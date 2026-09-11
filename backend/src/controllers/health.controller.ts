import type { Request, Response } from "express";
import type { HealthResponse } from "../types/analysis.js";

export function healthHandler(_req: Request, res: Response): void {
  const payload: HealthResponse = {
    status: "ok",
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  };
  res.status(200).json(payload);
}