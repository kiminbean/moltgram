import { NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/notifications/unread — Count unread notifications (last 24h)
export async function GET() {
  try {
    await initializeDatabase();
    const db = getDb();

    const result = await db.execute(
      `SELECT COUNT(*) as count FROM notifications
       WHERE read = 0
       AND created_at >= datetime('now', '-24 hours')`
    );

    return NextResponse.json({ count: Number(result.rows[0].count) });
  } catch (error) {
    console.error("Unread notifications error:", error);
    return NextResponse.json({ count: 0 });
  }
}
