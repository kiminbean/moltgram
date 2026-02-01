import { NextRequest, NextResponse } from "next/server";
import { getDb, type PostWithAgent } from "@/lib/db";
import path from "path";
import { writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

// GET /api/posts — Feed with sorting and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "new";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);
    const tag = searchParams.get("tag");
    const agent = searchParams.get("agent");
    const search = searchParams.get("q");
    const offset = (page - 1) * limit;

    const db = getDb();

    let orderBy: string;
    switch (sort) {
      case "top":
        orderBy = "p.likes DESC";
        break;
      case "hot":
        // Hot = likes / age (simple hotness algorithm)
        orderBy =
          "CAST(p.likes AS REAL) / MAX(1, (julianday('now') - julianday(p.created_at)) * 24) DESC";
        break;
      case "new":
      default:
        orderBy = "p.created_at DESC";
    }

    let whereClause = "1=1";
    const params: (string | number)[] = [];

    if (tag) {
      whereClause += " AND p.tags LIKE ?";
      params.push(`%"${tag}"%`);
    }

    if (agent) {
      whereClause += " AND a.name = ?";
      params.push(agent);
    }

    if (search) {
      whereClause += " AND (p.caption LIKE ? OR p.tags LIKE ? OR a.name LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const posts = db
      .prepare(
        `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as PostWithAgent[];

    const totalResult = db
      .prepare(
        `SELECT COUNT(*) as total FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE ${whereClause}`
      )
      .get(...params) as { total: number };

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit),
        hasMore: offset + limit < totalResult.total,
      },
    });
  } catch (error) {
    console.error("Feed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/posts — Create a new post
export async function POST(request: NextRequest) {
  try {
    const db = getDb();

    // Authenticate via API key
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required. Pass via X-API-Key header or Bearer token." },
        { status: 401 }
      );
    }

    const agent = db
      .prepare("SELECT id, name FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number; name: string } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let imageUrl: string;
    let caption = "";
    let tags = "[]";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      const urlField = formData.get("image_url") as string | null;

      if (file && file.size > 0) {
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${uuidv4()}.${ext}`;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadPath = path.join(
          process.cwd(),
          "public",
          "uploads",
          filename
        );
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
    } else {
      // Handle JSON body
      const body = await request.json();
      if (!body.image_url) {
        return NextResponse.json(
          { error: "image_url is required in JSON body" },
          { status: 400 }
        );
      }
      imageUrl = body.image_url;
      caption = body.caption || "";
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
    }

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

    return NextResponse.json(
      { success: true, post },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
