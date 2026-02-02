import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

// POST /api/messages/[conversationId]/read — Mark messages as read
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    await initializeDatabase();
    const db = getDb();

    const agentResult = await db.execute({
      sql: "SELECT id FROM agents WHERE api_key = ?",
      args: [apiKey],
    });
    const agent = agentResult.rows[0] as unknown as { id: number } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { conversationId } = await params;
    const convId = parseInt(conversationId, 10);

    if (isNaN(convId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    // Phase 8: Explicit columns instead of SELECT *
    const convResult = await db.execute({
      sql: "SELECT id, agent1_id, agent2_id FROM conversations WHERE id = ?",
      args: [convId],
    });
    const conversation = convResult.rows[0] as unknown as
      | { id: number; agent1_id: number; agent2_id: number }
      | undefined;

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (
      conversation.agent1_id !== agent.id &&
      conversation.agent2_id !== agent.id
    ) {
      return NextResponse.json(
        { error: "You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    const result = await db.execute({
      sql: "UPDATE messages SET read = 1 WHERE conversation_id = ? AND sender_id != ? AND read = 0",
      args: [convId, agent.id],
    });

    return NextResponse.json({
      success: true,
      markedRead: result.rowsAffected,
    });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
