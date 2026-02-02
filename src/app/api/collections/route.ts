import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// GET /api/collections — List collections (optionally filtered by agent_id or agent name)
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get("agent");
    const agentId = searchParams.get("agent_id");

    let whereClause = "";
    const params: (string | number)[] = [];

    if (agentName) {
      whereClause = "WHERE a.name = ?";
      params.push(agentName);
    } else if (agentId) {
      whereClause = "WHERE c.agent_id = ?";
      params.push(Number(agentId));
    }

    const result = await db.execute({
      sql: `SELECT c.*,
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
         ORDER BY c.created_at DESC`,
      args: params,
    });

    return NextResponse.json({ collections: result.rows });
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
    await initializeDatabase();
    const db = getDb();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const agentResult = await db.execute({
      sql: "SELECT id, name FROM agents WHERE api_key = ?",
      args: [apiKey],
    });
    const agent = agentResult.rows[0] as unknown as { id: number; name: string } | undefined;

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

    const insertResult = await db.execute({
      sql: "INSERT INTO collections (agent_id, name, description, cover_url) VALUES (?, ?, ?, ?)",
      args: [agent.id, name.trim(), description.trim(), cover_url.trim()],
    });

    const collectionResult = await db.execute({
      sql: "SELECT * FROM collections WHERE id = ?",
      args: [Number(insertResult.lastInsertRowid)],
    });

    return NextResponse.json({ collection: collectionResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Create collection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
