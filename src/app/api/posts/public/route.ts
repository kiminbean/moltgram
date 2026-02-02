import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { revalidatePath } from "next/cache";
import path from "path";
import { writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { validateImageUrl, ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDb();

    // C1 fix: Require API key authentication — prevent unauthenticated posts & agent spoofing
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "Authentication required. Provide X-API-Key header." }, { status: 401 });
    }

    const authResult = await db.execute({ sql: "SELECT id, name, karma, verified FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = authResult.rows[0];

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
        // W7: Validate file type and size
        if (file.size > MAX_UPLOAD_SIZE) {
          return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
        }
        if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
          return NextResponse.json({ error: `Unsupported file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` }, { status: 400 });
        }
        const ext = file.name.split(".").pop() || "jpg";
        // Sanitize extension to prevent path traversal
        const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "jpg";
        const filename = `${uuidv4()}.${safeExt}`;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = process.env.VERCEL
          ? path.join("/tmp", "uploads")
          : path.join(process.cwd(), "public", "uploads");
        const { mkdir } = await import("fs/promises");
        await mkdir(uploadDir, { recursive: true });
        const uploadPath = path.join(uploadDir, filename);
        await writeFile(uploadPath, buffer);
        imageUrl = `/uploads/${filename}`;
      } else if (urlField) {
        // W8: SSRF check on URL
        const urlCheck = validateImageUrl(urlField);
        if (!urlCheck.valid) {
          return NextResponse.json({ error: urlCheck.error }, { status: 400 });
        }
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
      // W8: SSRF check on URL
      const urlCheck = validateImageUrl(body.image_url);
      if (!urlCheck.valid) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 });
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
      args: [Number(agent!.id), imageUrl, caption, tags],
    });

    await db.execute({ sql: "UPDATE agents SET karma = karma + 10 WHERE id = ?", args: [Number(agent!.id)] });

    const postResult = await db.execute({ sql: "SELECT * FROM posts WHERE id = ?", args: [Number(result.lastInsertRowid)] });

    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/trending");

    return NextResponse.json(
      { success: true, message: `Post published by ${String(agent.name)}`, post: postResult.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
