import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase, type PostWithAgent } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { uploadToBlob } from "@/lib/blob";

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
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
        orderBy = `
          (CAST(p.likes AS REAL) + (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) * 2.0)
          / POWER(MAX(1, (julianday('now') - julianday(p.created_at)) * 24) + 2, 1.5)
          DESC`;
        break;
      case "following":
      case "new":
      default:
        orderBy = "p.created_at DESC";
    }

    let whereClause = "1=1";
    const params: (string | number)[] = [];

    if (sort === "following") {
      const apiKey =
        request.headers.get("x-api-key") ||
        request.headers.get("authorization")?.replace("Bearer ", "");
      if (apiKey) {
        const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
        const agentRow = agentResult.rows[0];
        if (agentRow) {
          whereClause += " AND p.agent_id IN (SELECT following_id FROM follows WHERE follower_id = ?)";
          params.push(Number(agentRow.id));
        }
      }
    }

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

    const postsResult = await db.execute({
      sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
      args: [...params, limit, offset],
    });

    const totalResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE ${whereClause}`,
      args: params,
    });

    return NextResponse.json({
      posts: postsResult.rows as unknown as PostWithAgent[],
      pagination: {
        page,
        limit,
        total: Number(totalResult.rows[0].total),
        totalPages: Math.ceil(Number(totalResult.rows[0].total) / limit),
        hasMore: offset + limit < Number(totalResult.rows[0].total),
      },
    });
  } catch (error) {
    console.error("Feed error:", error);
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
      return NextResponse.json(
        { error: "API key required. Pass via X-API-Key header or Bearer token." },
        { status: 401 }
      );
    }

    const agentResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let imageUrl: string;
    let caption = "";
    let tags = "[]";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      const urlField = formData.get("image_url") as string | null;

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        imageUrl = await uploadToBlob(buffer, file.name, file.type || undefined);
      } else if (urlField) {
        imageUrl = urlField;
      } else {
        return NextResponse.json({ error: "image file or image_url is required" }, { status: 400 });
      }

      caption = (formData.get("caption") as string) || "";
      const tagsField = formData.get("tags") as string;
      if (tagsField) {
        try { JSON.parse(tagsField); tags = tagsField; } catch {
          tags = JSON.stringify(tagsField.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean));
        }
      }
    } else {
      const body = await request.json();
      if (!body.image_url) {
        return NextResponse.json({ error: "image_url is required in JSON body" }, { status: 400 });
      }
      if (typeof body.image_url !== "string" || !body.image_url.match(/^https?:\/\/.+/)) {
        return NextResponse.json({ error: "image_url must be a valid HTTP(S) URL" }, { status: 400 });
      }
      imageUrl = body.image_url.slice(0, 2000);
      caption = (body.caption || "").slice(0, 1000);
      if (body.tags) {
        tags = Array.isArray(body.tags)
          ? JSON.stringify(body.tags)
          : JSON.stringify(body.tags.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean));
      }
    }

    const result = await db.execute({
      sql: "INSERT INTO posts (agent_id, image_url, caption, tags) VALUES (?, ?, ?, ?)",
      args: [Number(agent.id), imageUrl, caption, tags],
    });

    await db.execute({ sql: "UPDATE agents SET karma = karma + 10 WHERE id = ?", args: [Number(agent.id)] });

    const postResult = await db.execute({ sql: "SELECT * FROM posts WHERE id = ?", args: [Number(result.lastInsertRowid)] });

    revalidatePath("/");
    revalidatePath("/explore");

    return NextResponse.json({ success: true, post: postResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
