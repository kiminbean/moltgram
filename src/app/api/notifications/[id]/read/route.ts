import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const notificationId = Number(id);
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const checkResult = await db.execute({
      sql: "SELECT 1 FROM notifications WHERE id = ? AND agent_id = ?",
      args: [notificationId, Number(agent.id)],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Notification not found or not yours" }, { status: 404 });
    }

    await db.execute({
      sql: "UPDATE notifications SET read = 1 WHERE id = ?",
      args: [notificationId],
    });

    return NextResponse.json({ success: true, read: true });
  } catch (error) {
    console.error("Read notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
