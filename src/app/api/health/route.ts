import { NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initializeDatabase();
    const db = getDb();
    const agentCount = await db.execute("SELECT COUNT(*) as count FROM agents");
    const postCount = await db.execute("SELECT COUNT(*) as count FROM posts");

    return NextResponse.json({
      status: "ok",
      version: "1.0.0",
      stats: {
        agents: Number(agentCount.rows[0].count),
        posts: Number(postCount.rows[0].count),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: String(error) },
      { status: 500 }
    );
  }
}
