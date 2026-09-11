/**
 * Domain types for the WebPageTest integration (document v1.1, RF-20..26).
 */

import type { Metric } from "./analysis.js";

export type WptStatus = "pending" | "completed" | "error" | "timeout";

export interface WebPageTestRequestEvidence {
  url: string;
  host: string;
  contentType: string;
  startTime: number;
  loadTime: number;
  bytes: number;
  isThirdParty: boolean;
}

export interface WebPageTestSummary {
  testId: string;
  status: WptStatus;
  /** Normalized metrics extracted from the WPT run (source "wpt"). */
  metrics: Metric[];
  requests: number;
  bytes: number;
  topRequests: WebPageTestRequestEvidence[];
  waterfallRef?: string;
  analyzedAt: string;
  location?: string;
  browser?: string;
}

export interface WebPageTestDispatch {
  testId: string;
  jsonUrl: string;
}