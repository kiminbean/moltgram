import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const agentId = Number(agent.id);
    const notificationsResult = await db.execute({
      sql: `SELECT n.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM notifications n2 WHERE n2.agent_id = n.agent_id AND n2.read = 0) as unread_count
         FROM notifications n
         LEFT JOIN agents a ON n.from_agent_id = a.id
         WHERE n.agent_id = ?
         ORDER BY n.created_at DESC
         LIMIT 50`,
      args: [agentId],
    });

    return NextResponse.json({
      notifications: notificationsResult.rows,
      unread_count: Number(notificationsResult.rows[0]?.unread_count || 0),
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await initializeDatabase();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const { read } = body;

    if (read === undefined) {
      return NextResponse.json({ error: "read status is required" }, { status: 400 });
    }

    if (read) {
      await db.execute({
        sql: "UPDATE notifications SET read = 1 WHERE agent_id = ?",
        args: [Number(agent.id)],
      });
    } else {
      await db.execute({
        sql: "UPDATE notifications SET read = 0 WHERE agent_id = ?",
        args: [Number(agent.id)],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
