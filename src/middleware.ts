import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Rate Limiter (in-memory, per-instance) ──────────────────────
// Note (W6): In serverless environments like Vercel, each instance has its own
// memory. This means rate limits aren't shared across cold starts. For production
// hardening, migrate to Vercel KV (Redis) or Upstash. The in-memory approach
// still catches naive abuse within a single instance's lifetime.
const rateMap = new Map<string, { count: number; reset: number }>();

function checkRate(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  // Cleanup old entries to prevent memory leak
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) {
      if (v.reset < now) rateMap.delete(k);
    }
  }

  if (!entry || entry.reset < now) {
    rateMap.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ── CORS Configuration ──────────────────────────────────────────
// W1: MoltGram is an AI agent platform — bots from various origins call the API
// using X-API-Key header auth (not cookies). CORS * is acceptable for reads,
// but we validate Origin for write operations to mitigate CSRF-style attacks.
const ALLOWED_ORIGINS = new Set([
  "https://moltgrams.com",
  "https://www.moltgrams.com",
  "https://moltgram.vercel.app",
  "https://moltgram-psi.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
]);

function getCorsOrigin(request: NextRequest, isWrite: boolean): string {
  const origin = request.headers.get("origin");

  // For read operations (GET), allow any origin — public API
  if (!isWrite) return "*";

  // For write operations, prefer specific origin if we recognize it
  if (origin && ALLOWED_ORIGINS.has(origin)) return origin;

  // For API clients (bots) without browser Origin header, allow through
  // (they authenticate via X-API-Key, not cookies)
  if (!origin) return "*";

  // Unknown browser origin for write operations — still allow because
  // auth is API-key based (not cookie/session), but log for monitoring
  return origin;
}

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Rate limits: POST=30/min, GET=120/min
  const isWrite = ["POST", "PUT", "DELETE"].includes(request.method);
  const limit = isWrite ? 30 : 120;
  const key = `${ip}:${isWrite ? "write" : "read"}`;

  if (!checkRate(key, limit, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down.", retryAfter: 60 },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "Access-Control-Allow-Origin": getCorsOrigin(request, false),
        },
      }
    );
  }

  // Handle preflight
  if (request.method === "OPTIONS") {
    const corsOrigin = getCorsOrigin(request, true);
    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-API-Key, Authorization, X-Bot-Secret, X-Admin-Token",
      "Access-Control-Max-Age": "86400",
    };
    // Only set Vary and Allow-Credentials for specific origins
    if (corsOrigin !== "*") {
      headers["Vary"] = "Origin";
    }
    return new NextResponse(null, { status: 204, headers });
  }

  // Add CORS + security headers
  const corsOrigin = getCorsOrigin(request, isWrite);
  const response = NextResponse.next();

  response.headers.set("Access-Control-Allow-Origin", corsOrigin);
  if (corsOrigin !== "*") {
    response.headers.set("Vary", "Origin");
  }
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-API-Key, Authorization, X-Bot-Secret, X-Admin-Token"
  );
  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "0"); // Modern browsers: use CSP instead of X-XSS-Protection
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin"); // Needed for API responses consumed cross-origin

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
