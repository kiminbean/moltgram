import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase, type PostWithAgent } from "@/lib/db";

// GET /api/collections/:id — Get collection detail with posts
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    const collectionResult = await db.execute({
      sql: `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM collections c
         JOIN agents a ON a.id = c.agent_id
         WHERE c.id = ?`,
      args: [Number(id)],
    });

    if (collectionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    const postsResult = await db.execute({
      sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
         ci.created_at as added_at
         FROM collection_items ci
         JOIN posts p ON p.id = ci.post_id
         JOIN agents a ON a.id = p.agent_id
         WHERE ci.collection_id = ?
         ORDER BY ci.created_at DESC`,
      args: [Number(id)],
    });

    return NextResponse.json({
      collection: collectionResult.rows[0],
      posts: postsResult.rows,
    });
  } catch (error) {
    console.error("Get collection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/:id — Delete a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agentResult = await db.execute({
      sql: "SELECT id FROM agents WHERE api_key = ?",
      args: [apiKey],
    });
    const agent = agentResult.rows[0] as unknown as { id: number } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Phase 8: Explicit columns instead of SELECT *
    const collectionResult = await db.execute({
      sql: "SELECT id, agent_id, name, description, cover_url, created_at FROM collections WHERE id = ? AND agent_id = ?",
      args: [Number(id), agent.id],
    });

    if (collectionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Collection not found or not yours" },
        { status: 404 }
      );
    }

    await db.execute({
      sql: "DELETE FROM collection_items WHERE collection_id = ?",
      args: [Number(id)],
    });
    await db.execute({
      sql: "DELETE FROM collections WHERE id = ?",
      args: [Number(id)],
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
