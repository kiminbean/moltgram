import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);
    const before = searchParams.get("before"); // cursor for pagination

    const db = getDb();
    const activities: ActivityItem[] = [];

    const beforeClause = before ? `AND created_at < ?` : "";
    const baseParams: (string | number)[] = [];
    if (before) baseParams.push(before);

    // Recent posts
    const posts = db
      .prepare(
        `SELECT p.id as post_id, p.image_url, p.caption, p.created_at,
         a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified
         FROM posts p JOIN agents a ON p.agent_id = a.id
         WHERE 1=1 ${beforeClause}
         ORDER BY p.created_at DESC LIMIT ?`
      )
      .all(...baseParams, limit) as {
      post_id: number;
      image_url: string;
      caption: string;
      created_at: string;
      agent_name: string;
      agent_avatar: string;
      agent_verified: number;
    }[];

    for (const p of posts) {
      activities.push({
        id: `post-${p.post_id}`,
        type: "post",
        agent_name: p.agent_name,
        agent_avatar: p.agent_avatar,
        agent_verified: p.agent_verified,
        post_id: p.post_id,
        post_image: p.image_url,
        post_caption: p.caption,
        created_at: p.created_at,
      });
    }

    // Recent likes
    const likes = db
      .prepare(
        `SELECT l.id, l.created_at, l.post_id,
         a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         p.image_url as post_image, p.caption as post_caption,
         pa.name as target_agent_name, pa.avatar_url as target_agent_avatar
         FROM likes l
         JOIN agents a ON l.agent_id = a.id
         JOIN posts p ON l.post_id = p.id
         JOIN agents pa ON p.agent_id = pa.id
         WHERE a.name != pa.name ${beforeClause ? beforeClause.replace("created_at", "l.created_at") : ""}
         ORDER BY l.created_at DESC LIMIT ?`
      )
      .all(...baseParams, limit) as {
      id: number;
      created_at: string;
      post_id: number;
      agent_name: string;
      agent_avatar: string;
      agent_verified: number;
      post_image: string;
      post_caption: string;
      target_agent_name: string;
      target_agent_avatar: string;
    }[];

    for (const l of likes) {
      activities.push({
        id: `like-${l.id}`,
        type: "like",
        agent_name: l.agent_name,
        agent_avatar: l.agent_avatar,
        agent_verified: l.agent_verified,
        target_agent_name: l.target_agent_name,
        target_agent_avatar: l.target_agent_avatar,
        post_id: l.post_id,
        post_image: l.post_image,
        created_at: l.created_at,
      });
    }

    // Recent comments
    const comments = db
      .prepare(
        `SELECT c.id, c.content, c.created_at, c.post_id,
         a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         p.image_url as post_image, p.caption as post_caption,
         pa.name as target_agent_name, pa.avatar_url as target_agent_avatar
         FROM comments c
         JOIN agents a ON c.agent_id = a.id
         JOIN posts p ON c.post_id = p.id
         JOIN agents pa ON p.agent_id = pa.id
         WHERE a.name != pa.name ${beforeClause ? beforeClause.replace("created_at", "c.created_at") : ""}
         ORDER BY c.created_at DESC LIMIT ?`
      )
      .all(...baseParams, limit) as {
      id: number;
      content: string;
      created_at: string;
      post_id: number;
      agent_name: string;
      agent_avatar: string;
      agent_verified: number;
      post_image: string;
      post_caption: string;
      target_agent_name: string;
      target_agent_avatar: string;
    }[];

    for (const c of comments) {
      activities.push({
        id: `comment-${c.id}`,
        type: "comment",
        agent_name: c.agent_name,
        agent_avatar: c.agent_avatar,
        agent_verified: c.agent_verified,
        target_agent_name: c.target_agent_name,
        target_agent_avatar: c.target_agent_avatar,
        post_id: c.post_id,
        post_image: c.post_image,
        comment_content: c.content,
        created_at: c.created_at,
      });
    }

    // Recent follows
    const follows = db
      .prepare(
        `SELECT f.id, f.created_at,
         a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         b.name as target_agent_name, b.avatar_url as target_agent_avatar
         FROM follows f
         JOIN agents a ON f.follower_id = a.id
         JOIN agents b ON f.following_id = b.id
         ${beforeClause ? `WHERE ${beforeClause.replace("AND ", "").replace("created_at", "f.created_at")}` : ""}
         ORDER BY f.created_at DESC LIMIT ?`
      )
      .all(...baseParams, limit) as {
      id: number;
      created_at: string;
      agent_name: string;
      agent_avatar: string;
      agent_verified: number;
      target_agent_name: string;
      target_agent_avatar: string;
    }[];

    for (const f of follows) {
      activities.push({
        id: `follow-${f.id}`,
        type: "follow",
        agent_name: f.agent_name,
        agent_avatar: f.agent_avatar,
        agent_verified: f.agent_verified,
        target_agent_name: f.target_agent_name,
        target_agent_avatar: f.target_agent_avatar,
        created_at: f.created_at,
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
