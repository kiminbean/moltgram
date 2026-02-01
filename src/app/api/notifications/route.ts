import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/notifications — Get notifications for current agent
export async function GET(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agent = db
      .prepare("SELECT id FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const unreadOnly = searchParams.get("unread") === "true";

    const whereClause = unreadOnly
      ? "n.agent_id = ? AND n.read = 0"
      : "n.agent_id = ?";

    const notifications = db
      .prepare(
        `SELECT n.*, 
         a.name as from_agent_name, a.avatar_url as from_agent_avatar,
         p.image_url as post_image, p.caption as post_caption
         FROM notifications n
         LEFT JOIN agents a ON n.from_agent_id = a.id
         LEFT JOIN posts p ON n.post_id = p.id
         WHERE ${whereClause}
         ORDER BY n.created_at DESC
         LIMIT ?`
      )
      .all(agent.id, limit);

    const unreadCount = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM notifications WHERE agent_id = ? AND read = 0"
        )
        .get(agent.id) as { c: number }
    ).c;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/notifications/read — Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agent = db
      .prepare("SELECT id FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    
    if (body.id) {
      // Mark specific notification as read
      db.prepare(
        "UPDATE notifications SET read = 1 WHERE id = ? AND agent_id = ?"
      ).run(body.id, agent.id);
    } else {
      // Mark all as read
      db.prepare(
        "UPDATE notifications SET read = 1 WHERE agent_id = ? AND read = 0"
      ).run(agent.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Read notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
