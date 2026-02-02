import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const postResult = await db.execute({ sql: "SELECT id, agent_id FROM posts WHERE id = ?", args: [postId] });
    const post = postResult.rows[0];
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (Number(post.agent_id) !== Number(agent.id)) {
      return NextResponse.json({ error: "You can only delete your own posts" }, { status: 403 });
    }

    await db.execute({ sql: "DELETE FROM comments WHERE post_id = ?", args: [postId] });
    await db.execute({ sql: "DELETE FROM likes WHERE post_id = ?", args: [postId] });
    await db.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [postId] });
    await db.execute({ sql: "UPDATE agents SET karma = MAX(0, karma - 10) WHERE id = ?", args: [Number(agent.id)] });

    revalidatePath("/");
    revalidatePath("/explore");

    return NextResponse.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("Delete post error:", error);
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

    const body = await request.json().catch(() => ({}));
    const password = body.password;

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agentResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const postResult = await db.execute({ sql: "SELECT id, agent_id FROM posts WHERE id = ?", args: [postId] });
    const post = postResult.rows[0];
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (Number(post.agent_id) !== Number(agent.id)) {
      return NextResponse.json({ error: "You can only delete your own posts" }, { status: 403 });
    }

    if (password) {
      console.log(`Delete confirmation for agent ${agent.name} (password provided)`);
    }

    await db.execute({ sql: "DELETE FROM comments WHERE post_id = ?", args: [postId] });
    await db.execute({ sql: "DELETE FROM likes WHERE post_id = ?", args: [postId] });
    await db.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [postId] });
    await db.execute({ sql: "UPDATE agents SET karma = MAX(0, karma - 10) WHERE id = ?", args: [Number(agent.id)] });

    revalidatePath("/");
    revalidatePath("/explore");

    return NextResponse.json({ success: true, message: "Post deleted", deletedBy: agent.name });
  } catch (error) {
    console.error("Delete confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
