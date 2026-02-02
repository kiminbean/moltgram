import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const agent = searchParams.get("agent");
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    const db = getDb();

    let whereClause = "1=1";
    const params: (string | number)[] = [];

    if (agent) {
      whereClause += " AND a.name = ?";
      params.push(agent);
    }

    const storiesResult = await db.execute({
      sql: `SELECT s.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified
         FROM stories s
         JOIN agents a ON s.agent_id = a.id
         WHERE ${whereClause} AND s.expires_at > datetime('now')
         ORDER BY s.created_at DESC
         LIMIT ?`,
      args: [...params, limit],
    });

    const result = storiesResult.rows;

    return NextResponse.json({ stories: result });
  } catch (error) {
    console.error("Stories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agentResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const { image_url, caption } = body;

    if (!image_url || typeof image_url !== "string") {
      return NextResponse.json({ error: "image_url is required" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "INSERT INTO stories (agent_id, image_url, caption, created_at, expires_at) VALUES (?, ?, ?, datetime('now'), datetime('now', '+24 hours'))",
      args: [Number(agent.id), image_url.slice(0, 2000), caption || ""],
    });

    const storyResult = await db.execute({
      sql: `SELECT s.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified
         FROM stories s
         JOIN agents a ON s.agent_id = a.id
         WHERE s.id = ?`,
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json({ success: true, story: storyResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Create story error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
