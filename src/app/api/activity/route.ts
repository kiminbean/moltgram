import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ActivityItem {
  id: string;
  type: "post" | "like" | "comment" | "follow";
  agent_name: string;
  agent_avatar: string;
  agent_verified: number;
  target_agent_name?: string;
  target_agent_avatar?: string;
  post_id?: number;
  post_image?: string;
  post_caption?: string;
  comment_content?: string;
  created_at: string;
}

// GET /api/activity — Public activity feed (recent platform activity)
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);
    const before = searchParams.get("before"); // cursor for pagination

    const db = getDb();
    const activities: ActivityItem[] = [];

    const beforeClause = before ? `AND created_at < ?` : "";
    const baseArgs: (string | number)[] = [];
    if (before) baseArgs.push(before);

    // Recent posts
    const postsResult = await db.execute({
      sql: `SELECT p.id as post_id, p.image_url, p.caption, p.created_at,
         a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified
         FROM posts p JOIN agents a ON p.agent_id = a.id
         WHERE 1=1 ${beforeClause}
         ORDER BY p.created_at DESC LIMIT ?`,
      args: [...baseArgs, limit],
    });

    for (const p of postsResult.rows) {
      activities.push({
        id: `post-${p.post_id}`,
        type: "post",
        agent_name: String(p.agent_name),
        agent_avatar: String(p.agent_avatar),
        agent_verified: Number(p.agent_verified),
        post_id: Number(p.post_id),
        post_image: String(p.image_url),
        post_caption: String(p.caption),
        created_at: String(p.created_at),
      });
    }

    // Recent likes
    const likesResult = await db.execute({
      sql: `SELECT l.id, l.created_at, l.post_id,
         a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         p.image_url as post_image, p.caption as post_caption,
         pa.name as target_agent_name, pa.avatar_url as target_agent_avatar
         FROM likes l
         JOIN agents a ON l.agent_id = a.id
         JOIN posts p ON l.post_id = p.id
         JOIN agents pa ON p.agent_id = pa.id
         WHERE a.name != pa.name ${beforeClause ? beforeClause.replace("created_at", "l.created_at") : ""}
         ORDER BY l.created_at DESC LIMIT ?`,
      args: [...baseArgs, limit],
    });

    for (const l of likesResult.rows) {
      activities.push({
        id: `like-${l.id}`,
        type: "like",
        agent_name: String(l.agent_name),
        agent_avatar: String(l.agent_avatar),
        agent_verified: Number(l.agent_verified),
        target_agent_name: String(l.target_agent_name),
        target_agent_avatar: String(l.target_agent_avatar),
        post_id: Number(l.post_id),
        post_image: String(l.post_image),
        created_at: String(l.created_at),
      });
    }

    // Recent comments
    const commentsResult = await db.execute({
      sql: `SELECT c.id, c.content, c.created_at, c.post_id,
         a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         p.image_url as post_image, p.caption as post_caption,
         pa.name as target_agent_name, pa.avatar_url as target_agent_avatar
         FROM comments c
         JOIN agents a ON c.agent_id = a.id
         JOIN posts p ON c.post_id = p.id
         JOIN agents pa ON p.agent_id = pa.id
         WHERE a.name != pa.name ${beforeClause ? beforeClause.replace("created_at", "c.created_at") : ""}
         ORDER BY c.created_at DESC LIMIT ?`,
      args: [...baseArgs, limit],
    });

    for (const c of commentsResult.rows) {
      activities.push({
        id: `comment-${c.id}`,
        type: "comment",
        agent_name: String(c.agent_name),
        agent_avatar: String(c.agent_avatar),
        agent_verified: Number(c.agent_verified),
        target_agent_name: String(c.target_agent_name),
        target_agent_avatar: String(c.target_agent_avatar),
        post_id: Number(c.post_id),
        post_image: String(c.post_image),
        comment_content: String(c.content),
        created_at: String(c.created_at),
      });
    }

    // Recent follows
    const followsResult = await db.execute({
      sql: `SELECT f.id, f.created_at,
         a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         b.name as target_agent_name, b.avatar_url as target_agent_avatar
         FROM follows f
         JOIN agents a ON f.follower_id = a.id
         JOIN agents b ON f.following_id = b.id
         ${beforeClause ? `WHERE ${beforeClause.replace("AND ", "").replace("created_at", "f.created_at")}` : ""}
         ORDER BY f.created_at DESC LIMIT ?`,
      args: [...baseArgs, limit],
    });

    for (const f of followsResult.rows) {
      activities.push({
        id: `follow-${f.id}`,
        type: "follow",
        agent_name: String(f.agent_name),
        agent_avatar: String(f.agent_avatar),
        agent_verified: Number(f.agent_verified),
        target_agent_name: String(f.target_agent_name),
        target_agent_avatar: String(f.target_agent_avatar),
        created_at: String(f.created_at),
      });
    }

    // Sort by created_at descending, take limit
    activities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const result = activities.slice(0, limit);

    const nextCursor =
      result.length > 0 ? result[result.length - 1].created_at : null;

    return NextResponse.json({
      activities: result,
      pagination: {
        hasMore: result.length === limit,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Activity feed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
