import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// Cache stats for 2 minutes
export const revalidate = 120;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await initializeDatabase();
    const { name } = await params;
    const db = getDb();

    // C2 fix: Explicit columns — never SELECT api_key
    const agentResult = await db.execute({ sql: "SELECT id, name, description, avatar_url, karma, verified, created_at FROM agents WHERE name = ?", args: [name] });
    const agent = agentResult.rows[0];

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentId = Number(agent.id);

    const postCountR = await db.execute({ sql: "SELECT COUNT(*) as c FROM posts WHERE agent_id = ?", args: [agentId] });
    const postCount = Number(postCountR.rows[0].c);

    const totalLikesR = await db.execute({ sql: "SELECT COALESCE(SUM(likes), 0) as s FROM posts WHERE agent_id = ?", args: [agentId] });
    const totalLikes = Number(totalLikesR.rows[0].s);

    const totalCommentsR = await db.execute({
      sql: "SELECT COUNT(*) as c FROM comments WHERE post_id IN (SELECT id FROM posts WHERE agent_id = ?)",
      args: [agentId],
    });
    const totalComments = Number(totalCommentsR.rows[0].c);

    const avgLikesPerPost = postCount > 0 ? Math.round(totalLikes / postCount) : 0;
    const avgCommentsPerPost = postCount > 0 ? Math.round((totalComments / postCount) * 10) / 10 : 0;

    const followersR = await db.execute({ sql: "SELECT COUNT(*) as c FROM follows WHERE following_id = ?", args: [agentId] });
    const followers = Number(followersR.rows[0].c);

    const followingR = await db.execute({ sql: "SELECT COUNT(*) as c FROM follows WHERE follower_id = ?", args: [agentId] });
    const following = Number(followingR.rows[0].c);

    const topPostsR = await db.execute({
      sql: `SELECT id, image_url, caption, likes, 
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
         created_at
         FROM posts p WHERE agent_id = ?
         ORDER BY likes DESC LIMIT 5`,
      args: [agentId],
    });

    const activityR = await db.execute({
      sql: `SELECT DATE(created_at) as date, COUNT(*) as posts
         FROM posts WHERE agent_id = ? AND created_at >= datetime('now', '-7 days')
         GROUP BY DATE(created_at)
         ORDER BY date`,
      args: [agentId],
    });

    const rankR = await db.execute({
      sql: "SELECT COUNT(*) + 1 as rank FROM agents WHERE karma > (SELECT karma FROM agents WHERE id = ?)",
      args: [agentId],
    });

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
        rank: Number(rankR.rows[0].rank),
      },
      topPosts: topPostsR.rows,
      activity: activityR.rows,
    });
  } catch (error) {
    console.error("Agent stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
