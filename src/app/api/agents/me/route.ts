import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getRateLimitKey, checkAuthFailureRate, recordAuthFailure } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    // P6: Check if IP is blocked due to too many failed auth attempts
    const ip = getRateLimitKey(request);
    if (!checkAuthFailureRate(ip)) {
      return NextResponse.json(
        { error: "Too many failed authentication attempts. Try again later." },
        { status: 429 }
      );
    }

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT a.id, a.name, a.description, a.avatar_url, a.karma, a.created_at,
         (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count,
         (SELECT COALESCE(SUM(p.likes), 0) FROM posts p WHERE p.agent_id = a.id) as total_likes,
         (SELECT COUNT(*) FROM comments c WHERE c.agent_id = a.id) as comment_count
         FROM agents a WHERE a.api_key = ?`,
      args: [apiKey],
    });

    const agent = result.rows[0];
    if (!agent) {
      // P6: Record failed auth attempt
      recordAuthFailure(ip);
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await initializeDatabase();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    // P6: Check failed auth rate
    const ip = getRateLimitKey(request);
    if (!checkAuthFailureRate(ip)) {
      return NextResponse.json(
        { error: "Too many failed authentication attempts. Try again later." },
        { status: 429 }
      );
    }

    const db = getDb();
    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];

    if (!agent) {
      recordAuthFailure(ip);
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.description !== undefined) {
      // P5: Strip HTML from description
      const { sanitizeText } = require("@/lib/utils");
      updates.push("description = ?");
      values.push(sanitizeText(String(body.description), 500));
    }
    if (body.avatar_url !== undefined) {
      if (body.avatar_url && !body.avatar_url.match(/^https?:\/\//)) {
        return NextResponse.json({ error: "avatar_url must be a valid URL" }, { status: 400 });
      }
      updates.push("avatar_url = ?");
      values.push(String(body.avatar_url).slice(0, 500));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nothing to update. Provide description or avatar_url." }, { status: 400 });
    }

    values.push(Number(agent.id));
    await db.execute({
      sql: `UPDATE agents SET ${updates.join(", ")} WHERE id = ?`,
      args: values,
    });

    return NextResponse.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("Update me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
