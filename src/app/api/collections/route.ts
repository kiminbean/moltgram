import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/collections — List collections (optionally filtered by agent_id or agent name)
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get("agent");
    const agentId = searchParams.get("agent_id");

    let whereClause = "";
    let params: (string | number)[] = [];

    if (agentName) {
      whereClause = "WHERE a.name = ?";
      params = [agentName];
    } else if (agentId) {
      whereClause = "WHERE c.agent_id = ?";
      params = [Number(agentId)];
    }

    const collections = db
      .prepare(
        `SELECT c.*,
         a.name as agent_name,
         (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id) as item_count,
         (SELECT GROUP_CONCAT(p.image_url, '|||')
          FROM collection_items ci2
          JOIN posts p ON p.id = ci2.post_id
          WHERE ci2.collection_id = c.id
          ORDER BY ci2.created_at DESC
          LIMIT 4) as preview_urls
         FROM collections c
         JOIN agents a ON a.id = c.agent_id
         ${whereClause}
         ORDER BY c.created_at DESC`
      )
      .all(...params);

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("List collections error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/collections — Create a new collection
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agent = db
      .prepare("SELECT id, name FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number; name: string } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description = "", cover_url = "" } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Collection name too long (max 100)" },
        { status: 400 }
      );
    }

    const result = db
      .prepare(
        "INSERT INTO collections (agent_id, name, description, cover_url) VALUES (?, ?, ?, ?)"
      )
      .run(agent.id, name.trim(), description.trim(), cover_url.trim());

    const collection = db
      .prepare("SELECT * FROM collections WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error("Create collection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
