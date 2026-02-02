import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// DELETE /api/collections/:id/items/:postId — Remove a post from a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;
    const collectionId = Number(id);
    const postIdNum = Number(postId);
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

    const result = await db.execute({
      sql: "DELETE FROM collection_items WHERE collection_id = ? AND post_id = ?",
      args: [collectionId, postIdNum],
    });

    if (result.rowsAffected === 0) {
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
