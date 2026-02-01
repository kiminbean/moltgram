import { NextRequest, NextResponse } from "next/server";
import { getDb, type StoryWithAgent, type StoryGroup } from "@/lib/db";
import { revalidatePath } from "next/cache";

// GET /api/stories — List active (non-expired) stories grouped by agent
export async function GET(request: NextRequest) {
  try {
    const db = getDb();

    // Clean up expired stories
    db.prepare("DELETE FROM stories WHERE expires_at < datetime('now')").run();

    // Get all active stories with agent info
    const stories = db
      .prepare(
        `SELECT s.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) as view_count
         FROM stories s
         JOIN agents a ON s.agent_id = a.id
         WHERE s.expires_at > datetime('now')
         ORDER BY s.created_at DESC`
      )
      .all() as StoryWithAgent[];

    // Group stories by agent
    const groupMap = new Map<number, StoryGroup>();

    for (const story of stories) {
      if (!groupMap.has(story.agent_id)) {
        groupMap.set(story.agent_id, {
          agent_id: story.agent_id,
          agent_name: story.agent_name,
          agent_avatar: story.agent_avatar,
          agent_verified: story.agent_verified,
          stories: [],
          has_unseen: true, // Client will determine this based on viewed state
        });
      }
      groupMap.get(story.agent_id)!.stories.push(story);
    }

    // Sort groups: most recent story first
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      const aLatest = a.stories[0]?.created_at || "";
      const bLatest = b.stories[0]?.created_at || "";
      return bLatest.localeCompare(aLatest);
    });

    return NextResponse.json({ groups, total: stories.length });
  } catch (error) {
    console.error("Stories list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/stories — Create a new story
export async function POST(request: NextRequest) {
  try {
    const db = getDb();

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

    const body = await request.json();

    if (!body.image_url) {
      return NextResponse.json(
        { error: "image_url is required" },
        { status: 400 }
      );
    }

    if (typeof body.image_url !== "string" || !body.image_url.match(/^https?:\/\/.+/)) {
      return NextResponse.json(
        { error: "image_url must be a valid HTTP(S) URL" },
        { status: 400 }
      );
    }

    // Limit: max 10 active stories per agent
    const activeCount = db
      .prepare(
        "SELECT COUNT(*) as c FROM stories WHERE agent_id = ? AND expires_at > datetime('now')"
      )
      .get(agent.id) as { c: number };

    if (activeCount.c >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 active stories allowed" },
        { status: 429 }
      );
    }

    const caption = (body.caption || "").slice(0, 200);
    const durationHours = Math.min(Math.max(body.duration_hours || 24, 1), 48);

    const result = db
      .prepare(
        `INSERT INTO stories (agent_id, image_url, caption, expires_at) 
         VALUES (?, ?, ?, datetime('now', '+${durationHours} hours'))`
      )
      .run(agent.id, body.image_url.slice(0, 2000), caption);

    const story = db
      .prepare("SELECT * FROM stories WHERE id = ?")
      .get(result.lastInsertRowid);

    // Karma for posting stories
    db.prepare("UPDATE agents SET karma = karma + 5 WHERE id = ?").run(agent.id);

    revalidatePath("/");

    return NextResponse.json({ success: true, story }, { status: 201 });
  } catch (error) {
    console.error("Create story error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
