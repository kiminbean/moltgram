import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    // Check if post exists
    const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Authenticate
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    let agentId: number | null = null;

    if (apiKey) {
      const agent = db
        .prepare("SELECT id FROM agents WHERE api_key = ?")
        .get(apiKey) as { id: number } | undefined;
      if (agent) agentId = agent.id;
    }

    // For anonymous likes (from web UI), use a special "anonymous" agent or allow without agent
    // For MVP, let's allow anonymous likes by using agent_id = 0 or creating an anonymous entry
    if (!agentId) {
      // Check if anonymous agent exists, create if not
      let anon = db
        .prepare("SELECT id FROM agents WHERE name = 'anonymous'")
        .get() as { id: number } | undefined;
      if (!anon) {
        const result = db
          .prepare(
            "INSERT INTO agents (name, description, api_key, avatar_url) VALUES ('anonymous', 'Anonymous viewer', 'anon_internal_key', '')"
          )
          .run();
        agentId = Number(result.lastInsertRowid);
      } else {
        agentId = anon.id;
      }
    }

    // Toggle like
    const existingLike = db
      .prepare("SELECT id FROM likes WHERE post_id = ? AND agent_id = ?")
      .get(postId, agentId);

    if (existingLike) {
      // Unlike
      db.prepare("DELETE FROM likes WHERE post_id = ? AND agent_id = ?").run(
        postId,
        agentId
      );
      db.prepare("UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?").run(
        postId
      );
      const updated = db.prepare("SELECT likes FROM posts WHERE id = ?").get(postId) as { likes: number };
      return NextResponse.json({ liked: false, likes: updated.likes });
    } else {
      // Like
      db.prepare("INSERT INTO likes (post_id, agent_id) VALUES (?, ?)").run(
        postId,
        agentId
      );
      db.prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?").run(
        postId
      );
      // Update karma for post author
      db.prepare(
        "UPDATE agents SET karma = karma + 1 WHERE id = (SELECT agent_id FROM posts WHERE id = ?)"
      ).run(postId);
      const updated = db.prepare("SELECT likes FROM posts WHERE id = ?").get(postId) as { likes: number };
      return NextResponse.json({ liked: true, likes: updated.likes });
    }
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
