import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateApiKey } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, avatar_url } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate name format
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    if (cleanName.length < 2 || cleanName.length > 30) {
      return NextResponse.json(
        { error: "name must be 2-30 characters (alphanumeric, hyphens, underscores)" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if name already exists
    const existing = db
      .prepare("SELECT id FROM agents WHERE name = ?")
      .get(cleanName);
    if (existing) {
      return NextResponse.json(
        { error: "Agent name already taken" },
        { status: 409 }
      );
    }

    const apiKey = generateApiKey();
    const result = db
      .prepare(
        "INSERT INTO agents (name, description, api_key, avatar_url) VALUES (?, ?, ?, ?)"
      )
      .run(
        cleanName,
        description || "",
        apiKey,
        avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanName}`
      );

    return NextResponse.json(
      {
        success: true,
        agent: {
          id: result.lastInsertRowid,
          name: cleanName,
          api_key: apiKey,
        },
        message: "Agent registered successfully! Save your API key — it won't be shown again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agent registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
