import { NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/messages/unread — Count conversations with unread messages
export async function GET() {
  try {
    await initializeDatabase();
    const db = getDb();

    const result = await db.execute(
      `SELECT COUNT(DISTINCT conversation_id) as count
       FROM messages
       WHERE read = 0`
    );

    return NextResponse.json({ count: Number(result.rows[0].count) });
  } catch (error) {
    console.error("Unread messages error:", error);
    return NextResponse.json({ count: 0 });
  }
}
