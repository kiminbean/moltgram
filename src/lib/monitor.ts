/**
 * MoltGram — Lightweight Error & Performance Monitoring
 *
 * Provides structured logging, error tracking, and basic metrics
 * without external dependencies (no Sentry needed for MVP).
 *
 * Logs are written to /tmp/moltgram-errors.log (serverless-safe).
 * In development, also outputs to console with colors.
 */

import { appendFileSync, existsSync, statSync, renameSync } from "fs";
import path from "path";

// --- Types ---

interface ErrorEvent {
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  stack?: string;
  meta?: Record<string, unknown>;
}

interface MetricSnapshot {
  requestCount: number;
  errorCount: number;
  avgResponseMs: number;
  topErrors: Array<{ message: string; count: number }>;
  upSince: string;
}

// --- State ---

const LOG_PATH = process.env.VERCEL
  ? path.join("/tmp", "moltgram-errors.log")
  : path.join(process.cwd(), "logs", "errors.log");

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB max log file

// In-memory metrics (reset on cold start / serverless instance recycle)
let requestCount = 0;
let errorCount = 0;
let totalResponseMs = 0;
const errorCounts = new Map<string, number>();
const upSince = new Date().toISOString();

// --- Core Functions ---

/**
 * Log an error event to file and console
 */
export function logError(
  error: unknown,
  context?: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    meta?: Record<string, unknown>;
  }
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  const event: ErrorEvent = {
    timestamp: new Date().toISOString(),
    level: "error",
    message: err.message,
    endpoint: context?.endpoint,
    method: context?.method,
    statusCode: context?.statusCode,
    stack: err.stack?.split("\n").slice(0, 5).join("\n"),
    meta: context?.meta,
  };

  // Track in memory
  errorCount++;
  const key = `${context?.endpoint || "unknown"}:${err.message.slice(0, 80)}`;
  errorCounts.set(key, (errorCounts.get(key) || 0) + 1);

  // Write to log file
  writeLog(event);

  // Console output in development
  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[MoltGram ERROR] ${event.endpoint || "?"} — ${event.message}`
    );
  }
}

/**
 * Log a warning
 */
export function logWarn(
  message: string,
  context?: { endpoint?: string; meta?: Record<string, unknown> }
): void {
  const event: ErrorEvent = {
    timestamp: new Date().toISOString(),
    level: "warn",
    message,
    endpoint: context?.endpoint,
    meta: context?.meta,
  };
  writeLog(event);
}

/**
 * Track a request for metrics
 */
export function trackRequest(responseMs: number): void {
  requestCount++;
  totalResponseMs += responseMs;
}

/**
 * Get current metrics snapshot
 */
export function getMetrics(): MetricSnapshot {
  const topErrors = [...errorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([message, count]) => ({ message, count }));

  return {
    requestCount,
    errorCount,
    avgResponseMs: requestCount > 0 ? Math.round(totalResponseMs / requestCount) : 0,
    topErrors,
    upSince,
  };
}

/**
 * API error handler wrapper — wraps a route handler with error logging
 */
export function withMonitoring<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  endpoint: string
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    try {
      const response = await handler(...args);
      trackRequest(Date.now() - start);

      // Log slow requests (>2s)
      if (Date.now() - start > 2000) {
        logWarn(`Slow request: ${Date.now() - start}ms`, {
          endpoint,
          meta: { durationMs: Date.now() - start },
        });
      }

      return response;
    } catch (error) {
      trackRequest(Date.now() - start);
      logError(error, {
        endpoint,
        statusCode: 500,
        meta: { durationMs: Date.now() - start },
      });
      throw error; // Re-throw so Next.js can handle it
    }
  }) as T;
}

// --- Internal ---

function writeLog(event: ErrorEvent): void {
  try {
    // Ensure logs directory exists
    const dir = path.dirname(LOG_PATH);
    if (!existsSync(dir)) {
      const { mkdirSync } = require("fs");
      mkdirSync(dir, { recursive: true });
    }

    // Rotate if too large
    if (existsSync(LOG_PATH)) {
      const stats = statSync(LOG_PATH);
      if (stats.size > MAX_LOG_SIZE) {
        const rotated = LOG_PATH.replace(".log", `.${Date.now()}.log`);
        renameSync(LOG_PATH, rotated);
      }
    }

    const line = JSON.stringify(event) + "\n";
    appendFileSync(LOG_PATH, line, "utf-8");
  } catch {
    // Don't let logging errors break the app
    if (process.env.NODE_ENV !== "production") {
      console.error("[Monitor] Failed to write log");
    }
  }
}
