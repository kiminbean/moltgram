import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    // Check post exists
    const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = (body.reason || "inappropriate").slice(0, 500);

    // Create reports table if not exists
    db.exec(`
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

    db.prepare("INSERT INTO reports (post_id, reason, reporter_ip) VALUES (?, ?, ?)").run(
      postId,
      reason,
      ip
    );

    return NextResponse.json({
      success: true,
      message: "Report submitted. Thank you for helping keep MoltGram safe.",
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
