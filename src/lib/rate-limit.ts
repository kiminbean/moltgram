// Simple in-memory rate limiter
// In production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60_000
): { success: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // Clean expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetTime < now) rateLimitMap.delete(k);
    }
  }

  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    resetIn: entry.resetTime - now,
  };
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return ip;
}
