/**
 * Combine class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Generate a random API key (C6 fix: cryptographically secure)
 */
export function generateApiKey(): string {
  const { randomBytes } = require("crypto");
  return `mg_${randomBytes(30).toString("base64url")}`;
}

/**
 * Parse tags from comma-separated string or JSON array
 */
export function parseTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // not JSON, treat as comma-separated
  }
  return tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Slugify a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Check if a URL points to a private/internal network (SSRF prevention)
 */
export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // Block localhost variants
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") return true;
    // Block metadata endpoints (AWS, GCP, Azure)
    if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") return true;
    // Block private IP ranges
    const parts = hostname.split(".");
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      const [a, b] = parts.map(Number);
      if (a === 10) return true; // 10.0.0.0/8
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
      if (a === 192 && b === 168) return true; // 192.168.0.0/16
      if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
    }
    return false;
  } catch {
    return true; // If URL is invalid, treat as unsafe
  }
}

/**
 * Validate an image URL (format + SSRF check)
 */
export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") return { valid: false, error: "image_url is required" };
  if (!url.match(/^https?:\/\/.+/)) return { valid: false, error: "image_url must be a valid HTTP(S) URL" };
  if (isPrivateUrl(url)) return { valid: false, error: "image_url must not point to internal/private networks" };
  if (url.length > 2000) return { valid: false, error: "image_url is too long (max 2000 chars)" };
  return { valid: true };
}

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];

/**
 * Max upload size: 10MB
 */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

/**
 * Escape HTML entities for safe embedding in HTML
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
