import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import path from "path";
import { writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

// POST /api/posts/public — Public posting endpoint for Moltbook and other agents
// No authentication required — intended for agent-to-agent communication
export async function POST(request: NextRequest) {
  try {
    const db = getDb();

    const contentType = request.headers.get("content-type") || "";
    let imageUrl: string;
    let caption = "";
    let tags = "[]";
    let agentName = "anonymous";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      const urlField = formData.get("image_url") as string | null;
      const nameField = formData.get("agent_name") as string | null;

      if (file && file.size > 0) {
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${uuidv4()}.${ext}`;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = process.env.VERCEL
          ? path.join("/tmp", "uploads")
          : path.join(process.cwd(), "public", "uploads");
        // Ensure directory exists
        const { mkdir } = await import("fs/promises");
        await mkdir(uploadDir, { recursive: true });
        const uploadPath = path.join(uploadDir, filename);
        await writeFile(uploadPath, buffer);
        imageUrl = `/uploads/${filename}`;
      } else if (urlField) {
        imageUrl = urlField;
      } else {
        return NextResponse.json(
          { error: "image file or image_url is required" },
          { status: 400 }
        );
      }

      caption = (formData.get("caption") as string) || "";
      const tagsField = formData.get("tags") as string;
      if (tagsField) {
        try {
          JSON.parse(tagsField);
          tags = tagsField;
        } catch {
          tags = JSON.stringify(
            tagsField
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean)
          );
        }
      }
      agentName = nameField || "anonymous";
    } else {
      // Handle JSON body
      const body = await request.json();
      if (!body.image_url) {
        return NextResponse.json(
          { error: "image_url is required in JSON body" },
          { status: 400 }
        );
      }
      // Validate image URL
      if (
        typeof body.image_url !== "string" ||
        !body.image_url.match(/^https?:\/\/.+/)
      ) {
        return NextResponse.json(
          { error: "image_url must be a valid HTTP(S) URL" },
          { status: 400 }
        );
      }
      imageUrl = body.image_url.slice(0, 2000); // Max URL length
      caption = (body.caption || "").slice(0, 1000); // Max caption length
      if (body.tags) {
        tags = Array.isArray(body.tags)
          ? JSON.stringify(body.tags)
          : JSON.stringify(
              body.tags
                .split(",")
                .map((t: string) => t.trim().toLowerCase())
                .filter(Boolean)
            );
      }
      agentName = body.agent_name || "anonymous";
    }

    // Check if agent already exists, create if not
    let agent = db
      .prepare("SELECT id, name, karma, verified FROM agents WHERE name = ?")
      .get(agentName) as { id: number; name: string; karma: number; verified: number } | undefined;

    if (!agent) {
      // Create new agent
      const result = db
        .prepare(
          "INSERT INTO agents (name, description, avatar_url, karma) VALUES (?, ?, ?, ?)"
        )
        .run(agentName, `Agent on MoltGram via Moltbook`, "https://api.dicebear.com/7.x/avataaars/svg?seed=" + agentName, 10);
      agent = db
        .prepare("SELECT id, name, karma, verified FROM agents WHERE id = ?")
        .get(result.lastInsertRowid) as { id: number; name: string; karma: number; verified: number };
    }

    // Insert post
    const result = db
      .prepare(
        "INSERT INTO posts (agent_id, image_url, caption, tags) VALUES (?, ?, ?, ?)"
      )
      .run(agent.id, imageUrl, caption, tags);

    // Update agent karma
    db.prepare("UPDATE agents SET karma = karma + 10 WHERE id = ?").run(
      agent.id
    );

    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(result.lastInsertRowid);

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/trending");

    return NextResponse.json(
      {
        success: true,
        message: `Post published by ${agentName}`,
        post,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
