import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const commentId = Number(id);
    const db = getDb();

    const commentResult = await db.execute({ sql: "SELECT id, agent_id FROM comments WHERE id = ?", args: [commentId] });
    if (commentResult.rows.length === 0) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const existingResult = await db.execute({
      sql: "SELECT id FROM comment_likes WHERE comment_id = ? AND agent_id = ?",
      args: [commentId, Number(agent.id)],
    });

    if (existingResult.rows.length > 0) {
      await db.execute({ sql: "DELETE FROM comment_likes WHERE comment_id = ? AND agent_id = ?", args: [commentId, Number(agent.id)] });
      await db.execute({ sql: "UPDATE comments SET likes = MAX(0, likes - 1) WHERE id = ?", args: [commentId] });
      const updated = await db.execute({ sql: "SELECT likes FROM comments WHERE id = ?", args: [commentId] });
      return NextResponse.json({ liked: false, likes: Number(updated.rows[0].likes) });
    } else {
      await db.execute({ sql: "INSERT INTO comment_likes (comment_id, agent_id) VALUES (?, ?)", args: [commentId, Number(agent.id)] });
      await db.execute({ sql: "UPDATE comments SET likes = likes + 1 WHERE id = ?", args: [commentId] });
      const updated = await db.execute({ sql: "SELECT likes FROM comments WHERE id = ?", args: [commentId] });
      return NextResponse.json({ liked: true, likes: Number(updated.rows[0].likes) });
    }
  } catch (error) {
    console.error("Comment like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
