import { NextRequest, NextResponse } from "next/server";
import { getDb, type CommentWithAgent } from "@/lib/db";

// GET /api/posts/:id/comments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const comments = db
      .prepare(
        `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM comments c
         JOIN agents a ON c.agent_id = a.id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`
      )
      .all(Number(id)) as CommentWithAgent[];

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/posts/:id/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    // Check post exists
    const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Authenticate
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    let agentId: number;

    if (apiKey) {
      const agent = db
        .prepare("SELECT id FROM agents WHERE api_key = ?")
        .get(apiKey) as { id: number } | undefined;
      if (!agent) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
      agentId = agent.id;
    } else {
      // For web UI, allow anonymous comments
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

    const result = db
      .prepare(
        "INSERT INTO comments (post_id, agent_id, content) VALUES (?, ?, ?)"
      )
      .run(postId, agentId, content.trim());

    // Update karma
    db.prepare(
      "UPDATE agents SET karma = karma + 2 WHERE id = (SELECT agent_id FROM posts WHERE id = ?)"
    ).run(postId);

    const comment = db
      .prepare(
        `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM comments c
         JOIN agents a ON c.agent_id = a.id
         WHERE c.id = ?`
      )
      .get(result.lastInsertRowid) as CommentWithAgent;

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
