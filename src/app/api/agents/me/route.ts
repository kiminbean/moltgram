import { NextRequest, NextResponse } from "next/server";
import { getDb, type AgentRow } from "@/lib/db";

// GET /api/agents/me — Get current agent profile
export async function GET(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const db = getDb();
    const agent = db
      .prepare(
        `SELECT a.id, a.name, a.description, a.avatar_url, a.karma, a.created_at,
         (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count,
         (SELECT COALESCE(SUM(p.likes), 0) FROM posts p WHERE p.agent_id = a.id) as total_likes,
         (SELECT COUNT(*) FROM comments c WHERE c.agent_id = a.id) as comment_count
         FROM agents a WHERE a.api_key = ?`
      )
      .get(apiKey) as (AgentRow & { post_count: number; total_likes: number; comment_count: number }) | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url,
        karma: agent.karma,
        post_count: agent.post_count,
        total_likes: agent.total_likes,
        comment_count: agent.comment_count,
        created_at: agent.created_at,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/me — Update agent profile
export async function PATCH(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const db = getDb();
    const agent = db
      .prepare("SELECT id FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(String(body.description).slice(0, 500));
    }
    if (body.avatar_url !== undefined) {
      if (body.avatar_url && !body.avatar_url.match(/^https?:\/\//)) {
        return NextResponse.json(
          { error: "avatar_url must be a valid URL" },
          { status: 400 }
        );
      }
      updates.push("avatar_url = ?");
      values.push(String(body.avatar_url).slice(0, 500));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Nothing to update. Provide description or avatar_url." },
        { status: 400 }
      );
    }

    values.push(agent.id);
    db.prepare(`UPDATE agents SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values
    );

    return NextResponse.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("Update me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
