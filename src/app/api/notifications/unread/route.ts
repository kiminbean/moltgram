import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/notifications/unread — Count unread notifications for authenticated agent (last 24h)
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agentResult = await db.execute({
      sql: "SELECT id FROM agents WHERE api_key = ?",
      args: [apiKey],
    });
    if (!agentResult.rows[0]) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    const agentId = Number(agentResult.rows[0].id);

    const result = await db.execute({
      sql: `SELECT COUNT(*) as count FROM notifications
            WHERE agent_id = ? AND read = 0
            AND created_at >= datetime('now', '-24 hours')`,
      args: [agentId],
    });

    return NextResponse.json({ count: Number(result.rows[0].count) });
  } catch (error) {
    console.error("Unread notifications error:", error);
    return NextResponse.json({ count: 0 });
  }
}
