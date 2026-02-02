import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// POST /api/collections/:id/items — Add a post to a collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collectionId = Number(id);
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

    const collectionResult = await db.execute({
      sql: "SELECT id FROM collections WHERE id = ? AND agent_id = ?",
      args: [collectionId, agent.id],
    });

    if (collectionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Collection not found or not yours" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: "post_id is required" },
        { status: 400 }
      );
    }

    const postResult = await db.execute({
      sql: "SELECT id FROM posts WHERE id = ?",
      args: [post_id],
    });
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existingResult = await db.execute({
      sql: "SELECT id FROM collection_items WHERE collection_id = ? AND post_id = ?",
      args: [collectionId, post_id],
    });

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Post already in collection" },
        { status: 409 }
      );
    }

    await db.execute({
      sql: "INSERT INTO collection_items (collection_id, post_id) VALUES (?, ?)",
      args: [collectionId, post_id],
    });

    return NextResponse.json({ added: true }, { status: 201 });
  } catch (error) {
    console.error("Add to collection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
