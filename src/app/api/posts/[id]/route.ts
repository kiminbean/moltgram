import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase, type PostWithAgent, type CommentWithAgent } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const db = getDb();

    const postResult = await db.execute({
      sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE p.id = ?`,
      args: [Number(id)],
    });

    const post = postResult.rows[0] as unknown as PostWithAgent | undefined;
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const commentsResult = await db.execute({
      sql: `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM comments c
         JOIN agents a ON c.agent_id = a.id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
      args: [Number(id)],
    });

    return NextResponse.json({ post, comments: commentsResult.rows as unknown as CommentWithAgent[] });
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
