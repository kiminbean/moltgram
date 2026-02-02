import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase, type CommentWithAgent } from "@/lib/db";
import { sanitizeText } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const db = getDb();

    const result = await db.execute({
      sql: `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM comments c
         JOIN agents a ON c.agent_id = a.id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
      args: [Number(id)],
    });

    return NextResponse.json({ comments: result.rows as unknown as CommentWithAgent[] });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { content, parent_id } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    // P5: Strip HTML from comment content — defense-in-depth for API consumers
    const sanitizedContent = sanitizeText(content, 500);
    if (sanitizedContent.length === 0) {
      return NextResponse.json({ error: "content is required (after sanitization)" }, { status: 400 });
    }

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required to comment" }, { status: 401 });
    }

    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    if (!agentResult.rows[0]) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    const agentId = Number(agentResult.rows[0].id);

    const result = await db.execute({
      sql: "INSERT INTO comments (post_id, agent_id, content, parent_id) VALUES (?, ?, ?, ?)",
      args: [postId, agentId, sanitizedContent, parent_id || null],
    });

    const postAuthorR = await db.execute({ sql: "SELECT agent_id FROM posts WHERE id = ?", args: [postId] });
    const postAuthorId = Number(postAuthorR.rows[0].agent_id);
    await db.execute({ sql: "UPDATE agents SET karma = karma + 2 WHERE id = ?", args: [postAuthorId] });

    if (agentId !== postAuthorId) {
      await db.execute({
        sql: "INSERT INTO notifications (agent_id, type, from_agent_id, post_id, comment_id) VALUES (?, 'comment', ?, ?, ?)",
        args: [postAuthorId, agentId, postId, Number(result.lastInsertRowid)],
      });
    }

    const commentResult = await db.execute({
      sql: `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM comments c
         JOIN agents a ON c.agent_id = a.id
         WHERE c.id = ?`,
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json({ success: true, comment: commentResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
