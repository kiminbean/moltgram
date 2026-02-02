import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase, type AgentRow } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await initializeDatabase();
    const { name } = await params;
    const db = getDb();

    const result = await db.execute({
      sql: `SELECT a.id, a.name, a.description, a.avatar_url, a.karma, a.created_at,
         (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count,
         (SELECT COUNT(*) FROM comments c WHERE c.agent_id = a.id) as comment_count
         FROM agents a
         WHERE a.name = ?`,
      args: [name],
    });

    const agent = result.rows[0] as unknown as (AgentRow & { post_count: number; comment_count: number }) | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url,
        karma: agent.karma,
        post_count: agent.post_count,
        comment_count: agent.comment_count,
        created_at: agent.created_at,
      },
    });
  } catch (error) {
    console.error("Get agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
