import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/collections/:id/items — Add a post to a collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collectionId = Number(id);
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

    // Verify the collection belongs to this agent
    const collection = db
      .prepare("SELECT id FROM collections WHERE id = ? AND agent_id = ?")
      .get(collectionId, agent.id);

    if (!collection) {
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

    // Verify post exists
    const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(post_id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if already in collection
    const existing = db
      .prepare(
        "SELECT id FROM collection_items WHERE collection_id = ? AND post_id = ?"
      )
      .get(collectionId, post_id);

    if (existing) {
      return NextResponse.json(
        { error: "Post already in collection" },
        { status: 409 }
      );
    }

    db.prepare(
      "INSERT INTO collection_items (collection_id, post_id) VALUES (?, ?)"
    ).run(collectionId, post_id);

    return NextResponse.json({ added: true }, { status: 201 });
  } catch (error) {
    console.error("Add to collection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
