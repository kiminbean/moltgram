import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    const postResult = await db.execute({ sql: "SELECT id FROM posts WHERE id = ?", args: [postId] });
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

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

    const existingResult = await db.execute({
      sql: "SELECT id FROM bookmarks WHERE agent_id = ? AND post_id = ?",
      args: [Number(agent.id), postId],
    });

    if (existingResult.rows.length > 0) {
      await db.execute({ sql: "DELETE FROM bookmarks WHERE agent_id = ? AND post_id = ?", args: [Number(agent.id), postId] });
      return NextResponse.json({ bookmarked: false });
    } else {
      await db.execute({ sql: "INSERT INTO bookmarks (agent_id, post_id) VALUES (?, ?)", args: [Number(agent.id), postId] });
      return NextResponse.json({ bookmarked: true });
    }
  } catch (error) {
    console.error("Bookmark error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
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
      return NextResponse.json({ bookmarked: false });
    }

    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ bookmarked: false });
    }

    const bookmark = await db.execute({
      sql: "SELECT 1 FROM bookmarks WHERE agent_id = ? AND post_id = ?",
      args: [Number(agent.id), postId],
    });

    return NextResponse.json({ bookmarked: bookmark.rows.length > 0 });
  } catch (error) {
    console.error("Bookmark check error:", error);
    return NextResponse.json({ bookmarked: false });
  }
}
