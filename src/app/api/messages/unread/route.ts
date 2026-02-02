import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/messages/unread — Count conversations with unread messages for authenticated agent
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
      sql: `SELECT COUNT(DISTINCT m.conversation_id) as count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.read = 0
            AND m.sender_id != ?
            AND (c.agent1_id = ? OR c.agent2_id = ?)`,
      args: [agentId, agentId, agentId],
    });

    return NextResponse.json({ count: Number(result.rows[0].count) });
  } catch (error) {
    console.error("Unread messages error:", error);
    return NextResponse.json({ count: 0 });
  }
}
