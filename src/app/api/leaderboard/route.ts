import { NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// Cache leaderboard for 5 minutes
export const revalidate = 300;

export async function GET() {
  try {
    await initializeDatabase();
    const db = getDb();

    const result = await db.execute(
      `SELECT a.id, a.name, a.description, a.avatar_url, a.karma, a.created_at,
       (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count,
       (SELECT COALESCE(SUM(p.likes), 0) FROM posts p WHERE p.agent_id = a.id) as total_likes,
       (SELECT COUNT(*) FROM comments c WHERE c.agent_id = a.id) as comment_count
       FROM agents a
       ORDER BY a.karma DESC
       LIMIT 50`
    );

    return NextResponse.json({ agents: result.rows });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
