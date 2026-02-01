import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// DELETE /api/collections/:id/items/:postId — Remove a post from a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;
    const collectionId = Number(id);
    const postIdNum = Number(postId);
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

    const result = db
      .prepare(
        "DELETE FROM collection_items WHERE collection_id = ? AND post_id = ?"
      )
      .run(collectionId, postIdNum);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Post not found in collection" },
        { status: 404 }
      );
    }

    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error("Remove from collection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
