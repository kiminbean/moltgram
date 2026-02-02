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
    // Strip IPv6 brackets for comparison
    const bare = hostname.replace(/^\[|\]$/g, "");
    // Block localhost variants (IPv4, IPv6, and bracketed)
    if (bare === "localhost" || bare === "127.0.0.1" || bare === "::1" || bare === "0.0.0.0") return true;
    // Block metadata endpoints (AWS, GCP, Azure)
    if (bare === "169.254.169.254" || bare === "metadata.google.internal") return true;
    // Block IPv6 loopback & private ranges
    if (bare.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 — two forms:
      // 1. Dotted: ::ffff:127.0.0.1
      // 2. Hex (normalized by URL parser): ::ffff:7f00:1
      const mapped = bare.slice(7);
      if (isPrivateIPv4(mapped)) return true;
      // Parse hex form: e.g. "7f00:1" → 0x7f000001 → 127.0.0.1
      const hexParts = mapped.split(":");
      if (hexParts.length === 2) {
        const hi = parseInt(hexParts[0], 16) || 0;
        const lo = parseInt(hexParts[1], 16) || 0;
        const ipNum = (hi << 16) | lo;
        const a = (ipNum >> 24) & 0xff;
        const b = (ipNum >> 16) & 0xff;
        const reconstructed = `${a}.${b}.${(ipNum >> 8) & 0xff}.${ipNum & 0xff}`;
        if (isPrivateIPv4(reconstructed)) return true;
      }
    }
    if (bare === "0:0:0:0:0:0:0:1" || bare === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
    if (bare.startsWith("fe80:") || bare.startsWith("fe80%")) return true; // Link-local
    if (bare.startsWith("fc") || bare.startsWith("fd")) return true; // Unique local (ULA)
    // Block private IPv4 ranges (decimal notation)
    if (isPrivateIPv4(bare)) return true;
    // Block decimal/hex/octal IP representations (e.g. 2130706433 = 127.0.0.1)
    if (/^\d+$/.test(bare)) {
      const num = parseInt(bare, 10);
      if (num === 0 || num === 2130706433 /* 127.0.0.1 */) return true;
      if ((num >> 24) === 10) return true; // 10.0.0.0/8
      if ((num >> 20) === (172 * 16 + 1)) return true; // 172.16.0.0/12 → 0xAC1
      if ((num >> 16) === (192 * 256 + 168)) return true; // 192.168.0.0/16
      if ((num >> 16) === (169 * 256 + 254)) return true; // 169.254.0.0/16
    }
    if (/^0x[0-9a-f]+$/i.test(bare)) {
      const num = parseInt(bare, 16);
      if (num === 2130706433 || (num >> 24) === 10 || (num >> 24) === 127) return true;
    }
    return false;
  } catch {
    return true; // If URL is invalid, treat as unsafe
  }
}

function isPrivateIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
    if (a === 0) return true; // 0.0.0.0/8
  }
  return false;
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
 * Validate image magic bytes (file signature) — defense-in-depth against MIME spoofing.
 * Returns the detected MIME type or null if unrecognized.
 */
export function detectImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: 47 49 46 38 (GIF87a or GIF89a)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  // AVIF: ....ftypavif or ....ftypavis
  if (buffer.length >= 12) {
    const ftyp = buffer.toString("ascii", 4, 8);
    if (ftyp === "ftyp") {
      const brand = buffer.toString("ascii", 8, 12);
      if (brand === "avif" || brand === "avis") {
        return "image/avif";
      }
    }
  }
  return null;
}

/**
 * Strip HTML tags from user input — defense-in-depth for API consumers
 * that may not escape HTML when rendering.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize user text input: strip HTML tags and normalize whitespace.
 * Use for captions, comments, descriptions etc.
 */
export function sanitizeText(input: string, maxLength: number = 2000): string {
  return stripHtml(input).slice(0, maxLength).trim();
}

/**
 * Timing-safe string comparison to prevent timing attacks on secrets.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const { timingSafeEqual: tsEqual } = require("crypto");
  if (a.length !== b.length) {
    // Compare against self to keep constant time, then return false
    const buf = Buffer.from(a);
    tsEqual(buf, buf);
    return false;
  }
  return tsEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Safely serialize JSON for embedding in HTML <script> tags.
 * Prevents </script> injection and other break-out attacks.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

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
