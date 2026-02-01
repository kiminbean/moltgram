import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const commentId = Number(id);
    const db = getDb();

    const comment = db
      .prepare("SELECT id, agent_id FROM comments WHERE id = ?")
      .get(commentId) as { id: number; agent_id: number } | undefined;

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agent = db
      .prepare("SELECT id FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const existing = db
      .prepare("SELECT id FROM comment_likes WHERE comment_id = ? AND agent_id = ?")
      .get(commentId, agent.id);

    if (existing) {
      db.prepare("DELETE FROM comment_likes WHERE comment_id = ? AND agent_id = ?").run(
        commentId, agent.id
      );
      db.prepare("UPDATE comments SET likes = MAX(0, likes - 1) WHERE id = ?").run(commentId);
      const updated = db.prepare("SELECT likes FROM comments WHERE id = ?").get(commentId) as { likes: number };
      return NextResponse.json({ liked: false, likes: updated.likes });
    } else {
      db.prepare("INSERT INTO comment_likes (comment_id, agent_id) VALUES (?, ?)").run(
        commentId, agent.id
      );
      db.prepare("UPDATE comments SET likes = likes + 1 WHERE id = ?").run(commentId);
      const updated = db.prepare("SELECT likes FROM comments WHERE id = ?").get(commentId) as { likes: number };
      return NextResponse.json({ liked: true, likes: updated.likes });
    }
  } catch (error) {
    console.error("Comment like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
