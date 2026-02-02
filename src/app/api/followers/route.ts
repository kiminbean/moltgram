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
    const agentResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const agentId = Number(agent.id);
    const followersResult = await db.execute({
      sql: `SELECT a.id, a.name, a.description, a.avatar_url, a.karma, a.verified,
         (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count,
         (SELECT COUNT(*) FROM follows WHERE follower_id = a.id AND following_id = ?) as is_following
         FROM agents a
         JOIN follows f ON a.id = f.follower_id
         WHERE f.following_id = ?
         ORDER BY a.karma DESC
         LIMIT 50`,
      args: [agentId, agentId],
    });

    return NextResponse.json({
      followers: followersResult.rows,
      agent: { id: agentId, name: agent.name },
    });
  } catch (error) {
    console.error("Followers list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
