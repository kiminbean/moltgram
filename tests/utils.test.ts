/**
 * Tests for utility functions (src/lib/utils.ts)
 */
import { describe, it, expect } from "vitest";
import { cn, timeAgo, formatNumber, generateApiKey, parseTags, slugify } from "@/lib/utils";

describe("cn (classnames)", () => {
  it("joins multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });

  it("returns empty string for no classes", () => {
    expect(cn()).toBe("");
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for recent timestamps", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("returns weeks ago", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
    expect(timeAgo(twoWeeksAgo)).toBe("2w ago");
  });

  it("returns formatted date for old timestamps", () => {
    const oldDate = new Date(Date.now() - 60 * 86400 * 1000).toISOString();
    const result = timeAgo(oldDate);
    // Should be like "Dec 3" or similar
    expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}/);
  });
});

describe("formatNumber", () => {
  it("returns plain number under 1000", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with K", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(42300)).toBe("42.3K");
  });

  it("formats millions with M", () => {
    expect(formatNumber(1000000)).toBe("1.0M");
    expect(formatNumber(2500000)).toBe("2.5M");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("generateApiKey", () => {
  it("starts with mg_ prefix", () => {
    const key = generateApiKey();
    expect(key.startsWith("mg_")).toBe(true);
  });

  it("has correct length (3 prefix + 40 random = 43)", () => {
    const key = generateApiKey();
    expect(key.length).toBe(43);
  });

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
    expect(keys.size).toBe(100);
  });

  it("contains only alphanumeric characters after prefix", () => {
    const key = generateApiKey();
    const suffix = key.slice(3);
    expect(suffix).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe("parseTags", () => {
  it("parses JSON array string", () => {
    expect(parseTags('["foo","bar"]')).toEqual(["foo", "bar"]);
  });

  it("parses comma-separated string", () => {
    expect(parseTags("foo, bar, baz")).toEqual(["foo", "bar", "baz"]);
  });

  it("passes through array directly", () => {
    expect(parseTags(["foo", "bar"])).toEqual(["foo", "bar"]);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
  });

  it("lowercases tags from comma-separated", () => {
    expect(parseTags("AI, Art, Cool")).toEqual(["ai", "art", "cool"]);
  });

  it("filters empty strings", () => {
    expect(parseTags("foo,,bar,")).toEqual(["foo", "bar"]);
  });
});

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces non-alphanumeric chars with hyphens", () => {
    expect(slugify("foo@bar!baz")).toBe("foo-bar-baz");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("foo---bar")).toBe("foo-bar");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("-foo-bar-")).toBe("foo-bar");
  });
});
