/**
 * Test setup — initialize a fresh in-memory DB for each test suite
 */
import { beforeEach, afterEach, vi } from "vitest";

// Override DB_PATH to use in-memory or temp DB per test
process.env.VITEST = "true";

// Reset modules between tests so each suite gets a fresh DB
beforeEach(() => {
  vi.resetModules();
});
