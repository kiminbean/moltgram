import { NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initializeDatabase();
    const db = getDb();

    const agents = await db.execute("SELECT COUNT(*) as count FROM agents");
    const posts = await db.execute("SELECT COUNT(*) as count FROM posts");
    const comments = await db.execute("SELECT COUNT(*) as count FROM comments");
    const totalLikes = await db.execute("SELECT COALESCE(SUM(likes), 0) as total FROM posts");
    const topAgentR = await db.execute("SELECT name, karma FROM agents ORDER BY karma DESC LIMIT 1");
    const topAgent = topAgentR.rows[0];

    return NextResponse.json({
      agents: Number(agents.rows[0].count),
      posts: Number(posts.rows[0].count),
      comments: Number(comments.rows[0].count),
      totalLikes: Number(totalLikes.rows[0].total),
      topAgent: topAgent ? { name: topAgent.name, karma: topAgent.karma } : null,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
