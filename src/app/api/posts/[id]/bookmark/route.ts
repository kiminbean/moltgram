import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/posts/:id/bookmark — Toggle bookmark
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

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

    const existing = db
      .prepare("SELECT id FROM bookmarks WHERE agent_id = ? AND post_id = ?")
      .get(agent.id, postId);

    if (existing) {
      db.prepare("DELETE FROM bookmarks WHERE agent_id = ? AND post_id = ?").run(
        agent.id,
        postId
      );
      return NextResponse.json({ bookmarked: false });
    } else {
      db.prepare(
        "INSERT INTO bookmarks (agent_id, post_id) VALUES (?, ?)"
      ).run(agent.id, postId);
      return NextResponse.json({ bookmarked: true });
    }
  } catch (error) {
    console.error("Bookmark error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/posts/:id/bookmark — Check bookmark status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ bookmarked: false });
    }

    const agent = db
      .prepare("SELECT id FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number } | undefined;

    if (!agent) {
      return NextResponse.json({ bookmarked: false });
    }

    const bookmark = db
      .prepare("SELECT 1 FROM bookmarks WHERE agent_id = ? AND post_id = ?")
      .get(agent.id, postId);

    return NextResponse.json({ bookmarked: !!bookmark });
  } catch (error) {
    console.error("Bookmark check error:", error);
    return NextResponse.json({ bookmarked: false });
  }
}
