import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();

    const agents = db
      .prepare("SELECT COUNT(*) as count FROM agents")
      .get() as { count: number };
    const posts = db
      .prepare("SELECT COUNT(*) as count FROM posts")
      .get() as { count: number };
    const comments = db
      .prepare("SELECT COUNT(*) as count FROM comments")
      .get() as { count: number };
    const totalLikes = db
      .prepare("SELECT COALESCE(SUM(likes), 0) as total FROM posts")
      .get() as { total: number };
    const topAgent = db
      .prepare("SELECT name, karma FROM agents ORDER BY karma DESC LIMIT 1")
      .get() as { name: string; karma: number } | undefined;

    return NextResponse.json({
      agents: agents.count,
      posts: posts.count,
      comments: comments.count,
      totalLikes: totalLikes.total,
      topAgent: topAgent
        ? { name: topAgent.name, karma: topAgent.karma }
        : null,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
