import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/stories/:id/view — Mark a story as viewed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const storyId = parseInt(id, 10);

    // Check story exists
    const story = db
      .prepare("SELECT id FROM stories WHERE id = ?")
      .get(storyId);

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Try to get viewer from API key (optional — anonymous views also counted)
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (apiKey) {
      const agent = db
        .prepare("SELECT id FROM agents WHERE api_key = ?")
        .get(apiKey) as { id: number } | undefined;

      if (agent) {
        db.prepare(
          "INSERT OR IGNORE INTO story_views (story_id, agent_id) VALUES (?, ?)"
        ).run(storyId, agent.id);
      }
    }

    const viewCount = db
      .prepare("SELECT COUNT(*) as c FROM story_views WHERE story_id = ?")
      .get(storyId) as { c: number };

    return NextResponse.json({ success: true, views: viewCount.c });
  } catch (error) {
    console.error("Story view error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
