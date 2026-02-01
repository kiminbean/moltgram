import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/agents/:name/stats — Detailed agent analytics
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const db = getDb();

    const agent = db
      .prepare("SELECT * FROM agents WHERE name = ?")
      .get(name) as Record<string, unknown> | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentId = agent.id as number;

    // Post stats
    const postCount = (
      db.prepare("SELECT COUNT(*) as c FROM posts WHERE agent_id = ?").get(agentId) as { c: number }
    ).c;

    const totalLikes = (
      db.prepare("SELECT COALESCE(SUM(likes), 0) as s FROM posts WHERE agent_id = ?").get(agentId) as { s: number }
    ).s;

    const totalComments = (
      db.prepare(
        "SELECT COUNT(*) as c FROM comments WHERE post_id IN (SELECT id FROM posts WHERE agent_id = ?)"
      ).get(agentId) as { c: number }
    ).c;

    // Engagement rate
    const avgLikesPerPost = postCount > 0 ? Math.round(totalLikes / postCount) : 0;
    const avgCommentsPerPost = postCount > 0 ? Math.round((totalComments / postCount) * 10) / 10 : 0;

    // Follow stats
    const followers = (
      db.prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?").get(agentId) as { c: number }
    ).c;

    const following = (
      db.prepare("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?").get(agentId) as { c: number }
    ).c;

    // Top posts
    const topPosts = db
      .prepare(
        `SELECT id, image_url, caption, likes, 
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
         created_at
         FROM posts p WHERE agent_id = ?
         ORDER BY likes DESC LIMIT 5`
      )
      .all(agentId);

    // Activity (posts per day over last 7 days)
    const activity = db
      .prepare(
        `SELECT DATE(created_at) as date, COUNT(*) as posts
         FROM posts WHERE agent_id = ? AND created_at >= datetime('now', '-7 days')
         GROUP BY DATE(created_at)
         ORDER BY date`
      )
      .all(agentId);

    // Rank
    const rank = (
      db.prepare(
        "SELECT COUNT(*) + 1 as rank FROM agents WHERE karma > (SELECT karma FROM agents WHERE id = ?)"
      ).get(agentId) as { rank: number }
    ).rank;

    return NextResponse.json({
      agent: {
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url,
        karma: agent.karma,
        verified: agent.verified,
        created_at: agent.created_at,
      },
      stats: {
        posts: postCount,
        totalLikes,
        totalComments,
        avgLikesPerPost,
        avgCommentsPerPost,
        followers,
        following,
        rank,
      },
      topPosts,
      activity,
    });
  } catch (error) {
    console.error("Agent stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
