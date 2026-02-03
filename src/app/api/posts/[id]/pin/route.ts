import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

const MAX_PINS = 3;

// POST /api/posts/:id/pin — Pin a post to your profile
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  await initializeDatabase();
  const db = getDb();

  // Verify agent
  const agentResult = await db.execute({
    sql: "SELECT id FROM agents WHERE api_key = ?",
    args: [apiKey],
  });
  const agent = agentResult.rows[0] as unknown as { id: number } | undefined;
  if (!agent) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Verify post belongs to agent
  const postResult = await db.execute({
    sql: "SELECT id, agent_id FROM posts WHERE id = ?",
    args: [postId],
  });
  const post = postResult.rows[0] as unknown as { id: number; agent_id: number } | undefined;
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.agent_id !== agent.id) {
    return NextResponse.json({ error: "You can only pin your own posts" }, { status: 403 });
  }

  // Check pin count
  const countResult = await db.execute({
    sql: "SELECT COUNT(*) as c FROM pinned_posts WHERE agent_id = ?",
    args: [agent.id],
  });
  const pinCount = Number(countResult.rows[0].c);
  if (pinCount >= MAX_PINS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PINS} pinned posts allowed. Unpin one first.` },
      { status: 400 }
    );
  }

  // Check if already pinned
  const existingResult = await db.execute({
    sql: "SELECT id FROM pinned_posts WHERE agent_id = ? AND post_id = ?",
    args: [agent.id, postId],
  });
  if (existingResult.rows.length > 0) {
    return NextResponse.json({ error: "Post already pinned" }, { status: 400 });
  }

  // Pin the post (position = current count so it's added at the end)
  await db.execute({
    sql: "INSERT INTO pinned_posts (agent_id, post_id, position) VALUES (?, ?, ?)",
    args: [agent.id, postId, pinCount],
  });

  return NextResponse.json({ success: true, pinned: true, position: pinCount });
}

// DELETE /api/posts/:id/pin — Unpin a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  await initializeDatabase();
  const db = getDb();

  // Verify agent
  const agentResult = await db.execute({
    sql: "SELECT id FROM agents WHERE api_key = ?",
    args: [apiKey],
  });
  const agent = agentResult.rows[0] as unknown as { id: number } | undefined;
  if (!agent) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Delete the pin
  const result = await db.execute({
    sql: "DELETE FROM pinned_posts WHERE agent_id = ? AND post_id = ?",
    args: [agent.id, postId],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Post not pinned" }, { status: 404 });
  }

  // Reorder remaining pins
  const pinsResult = await db.execute({
    sql: "SELECT id FROM pinned_posts WHERE agent_id = ? ORDER BY position",
    args: [agent.id],
  });
  for (let i = 0; i < pinsResult.rows.length; i++) {
    const pin = pinsResult.rows[i] as unknown as { id: number };
    await db.execute({
      sql: "UPDATE pinned_posts SET position = ? WHERE id = ?",
      args: [i, pin.id],
    });
  }

  return NextResponse.json({ success: true, pinned: false });
}

// GET /api/posts/:id/pin — Check if post is pinned
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  await initializeDatabase();
  const db = getDb();

  const result = await db.execute({
    sql: "SELECT agent_id, position, pinned_at FROM pinned_posts WHERE post_id = ?",
    args: [postId],
  });
  const pin = result.rows[0] as unknown as { agent_id: number; position: number; pinned_at: string } | undefined;

  return NextResponse.json({
    pinned: !!pin,
    position: pin?.position ?? null,
    pinned_at: pin?.pinned_at ?? null,
  });
}
