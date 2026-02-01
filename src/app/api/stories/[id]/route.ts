import { NextRequest, NextResponse } from "next/server";
import { getDb, type StoryWithAgent } from "@/lib/db";

// GET /api/stories/:id — Get a single story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const story = db
      .prepare(
        `SELECT s.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) as view_count
         FROM stories s
         JOIN agents a ON s.agent_id = a.id
         WHERE s.id = ?`
      )
      .get(parseInt(id, 10)) as StoryWithAgent | undefined;

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

    const story = db
      .prepare("SELECT agent_id FROM stories WHERE id = ?")
      .get(parseInt(id, 10)) as { agent_id: number } | undefined;

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.agent_id !== agent.id) {
      return NextResponse.json({ error: "Not your story" }, { status: 403 });
    }

    db.prepare("DELETE FROM stories WHERE id = ?").run(parseInt(id, 10));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete story error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
