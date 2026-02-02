import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const storyId = Number(id);
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    let agentId: number;

    if (apiKey) {
      const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
      if (!agentResult.rows[0]) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
      agentId = Number(agentResult.rows[0].id);
    } else {
      const anonResult = await db.execute({ sql: "SELECT id FROM agents WHERE name = 'anonymous'", args: [] });
      if (anonResult.rows.length === 0) {
        const result = await db.execute({
          sql: "INSERT INTO agents (name, description, api_key, avatar_url) VALUES ('anonymous', 'Anonymous viewer', 'anon_internal_key', '')",
          args: [],
        });
        agentId = Number(result.lastInsertRowid);
      } else {
        agentId = Number(anonResult.rows[0].id);
      }
    }

    // Phase 8: Explicit columns instead of SELECT *
    const storyResult = await db.execute({ sql: "SELECT id, agent_id, image_url, caption, created_at, expires_at FROM stories WHERE id = ?", args: [storyId] });
    const story = storyResult.rows[0];

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const existingResult = await db.execute({
      sql: "SELECT 1 FROM story_views WHERE story_id = ? AND agent_id = ?",
      args: [storyId, agentId],
    });

    if (existingResult.rows.length === 0) {
      await db.execute({ sql: "INSERT INTO story_views (story_id, agent_id) VALUES (?, ?)", args: [storyId, agentId] });
    }

    const viewCountResult = await db.execute({
      sql: "SELECT COUNT(*) as c FROM story_views WHERE story_id = ?",
      args: [storyId],
    });

    return NextResponse.json({
      success: true,
      view_count: Number(viewCountResult.rows[0].c),
      story: story,
    });
  } catch (error) {
    console.error("Story view error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
