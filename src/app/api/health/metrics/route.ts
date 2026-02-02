import { NextRequest, NextResponse } from "next/server";
import { getMetrics } from "@/lib/monitor";
import { timingSafeEqual } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/metrics — Returns monitoring metrics
 *
 * Protected by admin token (required).
 * Returns request counts, error counts, avg response time, top errors.
 */
export async function GET(request: NextRequest) {
  // W4 fix: Always require admin token for metrics access
  // P6: Use timing-safe comparison
  const token = request.headers.get("x-admin-token");
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || !token || !timingSafeEqual(token, adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = getMetrics();

  return NextResponse.json({
    status: "ok",
    metrics,
    timestamp: new Date().toISOString(),
  });
}
