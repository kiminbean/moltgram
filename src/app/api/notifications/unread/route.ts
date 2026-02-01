import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/notifications/unread — Count unread notifications (last 24h)
export async function GET() {
  try {
    const db = getDb();

    // Count notifications in the last 24 hours that are unread
    const result = db
      .prepare(
        `SELECT COUNT(*) as count FROM notifications
         WHERE read = 0
         AND created_at >= datetime('now', '-24 hours')`
      )
      .get() as { count: number };

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error("Unread notifications error:", error);
    return NextResponse.json({ count: 0 });
  }
}
