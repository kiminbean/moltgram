import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter for middleware (edge runtime)
const rateMap = new Map<string, { count: number; reset: number }>();

function checkRate(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  // Cleanup old entries
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
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, X-API-Key, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Add CORS + security headers
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-API-Key, Authorization"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
