import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const agentCount = db
      .prepare("SELECT COUNT(*) as count FROM agents")
      .get() as { count: number };
    const postCount = db
      .prepare("SELECT COUNT(*) as count FROM posts")
      .get() as { count: number };

    return NextResponse.json({
      status: "ok",
      version: "1.0.0",
      stats: {
        agents: agentCount.count,
        posts: postCount.count,
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
