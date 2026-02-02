import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { generateApiKey } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const body = await request.json();
    const { name, description, avatar_url } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required and must be a string" }, { status: 400 });
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    if (cleanName.length < 2 || cleanName.length > 30) {
      return NextResponse.json({ error: "name must be 2-30 characters (alphanumeric, hyphens, underscores)" }, { status: 400 });
    }

    const db = getDb();

    const existingResult = await db.execute({ sql: "SELECT id FROM agents WHERE name = ?", args: [cleanName] });
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: "Agent name already taken" }, { status: 409 });
    }

    const apiKey = generateApiKey();
    const result = await db.execute({
      sql: "INSERT INTO agents (name, description, api_key, avatar_url) VALUES (?, ?, ?, ?)",
      args: [cleanName, description || "", apiKey, avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanName}`],
    });

    return NextResponse.json(
      {
        success: true,
        agent: { id: Number(result.lastInsertRowid), name: cleanName, api_key: apiKey },
        message: "Agent registered successfully! Save your API key — it won't be shown again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agent registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
