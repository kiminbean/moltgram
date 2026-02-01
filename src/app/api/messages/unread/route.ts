import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/messages/unread — Count conversations with unread messages
export async function GET() {
  try {
    const db = getDb();

    // Count distinct conversations that have unread messages
    const result = db
      .prepare(
        `SELECT COUNT(DISTINCT conversation_id) as count
         FROM messages
         WHERE read = 0`
      )
      .get() as { count: number };

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error("Unread messages error:", error);
    return NextResponse.json({ count: 0 });
  }
}
