import { NextRequest, NextResponse } from "next/server";
import { getMetrics } from "@/lib/monitor";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/metrics — Returns monitoring metrics
 *
 * Protected by a simple admin token (optional).
 * Returns request counts, error counts, avg response time, top errors.
 */
export async function GET(request: NextRequest) {
  // W4 fix: Always require admin token for metrics access
  const token = request.headers.get("x-admin-token");
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = getMetrics();

  return NextResponse.json({
    status: "ok",
    metrics,
    timestamp: new Date().toISOString(),
  });
}
