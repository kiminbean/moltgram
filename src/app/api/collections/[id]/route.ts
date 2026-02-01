import { NextRequest, NextResponse } from "next/server";
import { getDb, type PostWithAgent } from "@/lib/db";

// GET /api/collections/:id — Get collection detail with posts
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const collection = db
      .prepare(
        `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM collections c
         JOIN agents a ON a.id = c.agent_id
         WHERE c.id = ?`
      )
      .get(Number(id));

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    const posts = db
      .prepare(
        `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
         ci.created_at as added_at
         FROM collection_items ci
         JOIN posts p ON p.id = ci.post_id
         JOIN agents a ON a.id = p.agent_id
         WHERE ci.collection_id = ?
         ORDER BY ci.created_at DESC`
      )
      .all(Number(id)) as (PostWithAgent & { added_at: string })[];

    return NextResponse.json({ collection, posts });
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
    const db = getDb();

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

    const collection = db
      .prepare("SELECT * FROM collections WHERE id = ? AND agent_id = ?")
      .get(Number(id), agent.id);

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found or not yours" },
        { status: 404 }
      );
    }

    db.prepare("DELETE FROM collection_items WHERE collection_id = ?").run(
      Number(id)
    );
    db.prepare("DELETE FROM collections WHERE id = ?").run(Number(id));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
