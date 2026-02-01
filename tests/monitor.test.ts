/**
 * Tests for monitoring/error tracking (src/lib/monitor.ts)
 */
import { describe, it, expect, beforeEach } from "vitest";

// We test the pure logic by importing and using the functions directly
// Note: logError writes to disk, so we test the metrics tracking

describe("Monitor", () => {
  // Import fresh each time to reset state
  let monitor: typeof import("@/lib/monitor");

  beforeEach(async () => {
    // Reset module state
    const mod = await import("@/lib/monitor");
    monitor = mod;
  });

  it("trackRequest increments request count", () => {
    const before = monitor.getMetrics().requestCount;
    monitor.trackRequest(50);
    monitor.trackRequest(100);
    const after = monitor.getMetrics();
    expect(after.requestCount).toBe(before + 2);
  });

  it("getMetrics returns correct avg response time", () => {
    const before = monitor.getMetrics();
    const baseCount = before.requestCount;
    const baseTotal = before.avgResponseMs * baseCount;

    monitor.trackRequest(100);
    monitor.trackRequest(200);

    const metrics = monitor.getMetrics();
    const expectedAvg = Math.round((baseTotal + 300) / (baseCount + 2));
    expect(metrics.avgResponseMs).toBe(expectedAvg);
  });

  it("logError increments error count", () => {
    const before = monitor.getMetrics().errorCount;
    monitor.logError(new Error("Test error"), { endpoint: "/test" });
    const after = monitor.getMetrics().errorCount;
    expect(after).toBe(before + 1);
  });

  it("logError tracks top errors", () => {
    monitor.logError(new Error("Recurring error"), { endpoint: "/api/test" });
    monitor.logError(new Error("Recurring error"), { endpoint: "/api/test" });
    monitor.logError(new Error("One-off error"), { endpoint: "/api/other" });

    const metrics = monitor.getMetrics();
    expect(metrics.topErrors.length).toBeGreaterThan(0);
    // The recurring error should have higher count
    const recurring = metrics.topErrors.find((e) =>
      e.message.includes("Recurring error")
    );
    expect(recurring).toBeDefined();
    expect(recurring!.count).toBeGreaterThanOrEqual(2);
  });

  it("getMetrics includes upSince timestamp", () => {
    const metrics = monitor.getMetrics();
    expect(metrics.upSince).toBeTruthy();
    expect(new Date(metrics.upSince).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("logError handles non-Error objects", () => {
    const before = monitor.getMetrics().errorCount;
    monitor.logError("string error");
    monitor.logError({ custom: "error" });
    monitor.logError(42);
    const after = monitor.getMetrics().errorCount;
    expect(after).toBe(before + 3);
  });
});
