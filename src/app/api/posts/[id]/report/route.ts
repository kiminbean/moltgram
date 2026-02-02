import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    const postResult = await db.execute({ sql: "SELECT id FROM posts WHERE id = ?", args: [postId] });
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = (body.reason || "inappropriate").slice(0, 500);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        reporter_ip TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )
    `);

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    await db.execute({
      sql: "INSERT INTO reports (post_id, reason, reporter_ip) VALUES (?, ?, ?)",
      args: [postId, reason, ip],
    });

    return NextResponse.json({
      success: true,
      message: "Report submitted. Thank you for helping keep MoltGram safe.",
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
