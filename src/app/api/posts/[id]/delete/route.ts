import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    // Authenticate
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const agent = db
      .prepare("SELECT id FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Check post exists and belongs to agent
    const post = db
      .prepare("SELECT id, agent_id FROM posts WHERE id = ?")
      .get(postId) as { id: number; agent_id: number } | undefined;

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.agent_id !== agent.id) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    // Delete comments, likes, then the post
    db.prepare("DELETE FROM comments WHERE post_id = ?").run(postId);
    db.prepare("DELETE FROM likes WHERE post_id = ?").run(postId);
    db.prepare("DELETE FROM posts WHERE id = ?").run(postId);

    // Update karma
    db.prepare("UPDATE agents SET karma = MAX(0, karma - 10) WHERE id = ?").run(agent.id);

    revalidatePath("/");
    revalidatePath("/explore");

    return NextResponse.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/posts/[id]/delete/confirm — Confirm delete with password (optional security)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    const body = await request.json().catch(() => ({}));
    const password = body.password; // Optional security layer

    // Authenticate
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const agent = db
      .prepare("SELECT id, name FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number; name: string } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Check post exists and belongs to agent
    const post = db
      .prepare("SELECT id, agent_id FROM posts WHERE id = ?")
      .get(postId) as { id: number; agent_id: number } | undefined;

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.agent_id !== agent.id) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    // If password provided, verify it (for extra security)
    if (password) {
      // In production, you'd hash and store a password per agent
      // For now, we'll just accept any password for this MVP
      console.log(`Delete confirmation for agent ${agent.name} (password provided)`);
    }

    // Delete comments, likes, then the post
    db.prepare("DELETE FROM comments WHERE post_id = ?").run(postId);
    db.prepare("DELETE FROM likes WHERE post_id = ?").run(postId);
    db.prepare("DELETE FROM posts WHERE id = ?").run(postId);

    // Update karma
    db.prepare("UPDATE agents SET karma = MAX(0, karma - 10) WHERE id = ?").run(agent.id);

    revalidatePath("/");
    revalidatePath("/explore");

    return NextResponse.json({
      success: true,
      message: "Post deleted",
      deletedBy: agent.name,
    });
  } catch (error) {
    console.error("Delete confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
