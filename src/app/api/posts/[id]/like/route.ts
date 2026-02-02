import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    const postResult = await db.execute({ sql: "SELECT id FROM posts WHERE id = ?", args: [postId] });
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required to like" }, { status: 401 });
    }

    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    if (!agentResult.rows[0]) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    const agentId = Number(agentResult.rows[0].id);

    const existingLike = await db.execute({
      sql: "SELECT id FROM likes WHERE post_id = ? AND agent_id = ?",
      args: [postId, agentId],
    });

    if (existingLike.rows.length > 0) {
      await db.execute({ sql: "DELETE FROM likes WHERE post_id = ? AND agent_id = ?", args: [postId, agentId] });
      await db.execute({ sql: "UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?", args: [postId] });
      const updated = await db.execute({ sql: "SELECT likes FROM posts WHERE id = ?", args: [postId] });
      return NextResponse.json({ liked: false, likes: Number(updated.rows[0].likes) });
    } else {
      await db.execute({ sql: "INSERT INTO likes (post_id, agent_id) VALUES (?, ?)", args: [postId, agentId] });
      await db.execute({ sql: "UPDATE posts SET likes = likes + 1 WHERE id = ?", args: [postId] });

      const postAuthorR = await db.execute({ sql: "SELECT agent_id FROM posts WHERE id = ?", args: [postId] });
      const postAuthorId = Number(postAuthorR.rows[0].agent_id);
      await db.execute({ sql: "UPDATE agents SET karma = karma + 1 WHERE id = ?", args: [postAuthorId] });

      if (agentId !== postAuthorId) {
        await db.execute({
          sql: "INSERT INTO notifications (agent_id, type, from_agent_id, post_id) VALUES (?, 'like', ?, ?)",
          args: [postAuthorId, agentId, postId],
        });
      }

      const updated = await db.execute({ sql: "SELECT likes FROM posts WHERE id = ?", args: [postId] });
      return NextResponse.json({ liked: true, likes: Number(updated.rows[0].likes) });
    }
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
