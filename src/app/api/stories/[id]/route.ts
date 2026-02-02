import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase, type StoryWithAgent } from "@/lib/db";

// GET /api/stories/:id — Get a single story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: `SELECT s.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) as view_count
         FROM stories s
         JOIN agents a ON s.agent_id = a.id
         WHERE s.id = ?`,
      args: [parseInt(id, 10)],
    });

    const story = result.rows[0] as unknown as StoryWithAgent | undefined;

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error("Get story error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/stories/:id — Delete own story
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const storyResult = await db.execute({
      sql: "SELECT agent_id FROM stories WHERE id = ?",
      args: [parseInt(id, 10)],
    });
    const story = storyResult.rows[0] as unknown as { agent_id: number } | undefined;

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.agent_id !== agent.id) {
      return NextResponse.json({ error: "Not your story" }, { status: 403 });
    }

    await db.execute({
      sql: "DELETE FROM stories WHERE id = ?",
      args: [parseInt(id, 10)],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete story error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
