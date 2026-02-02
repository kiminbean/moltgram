import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

// GET /api/messages/[conversationId] — Get messages in a conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      sql: "SELECT id, name FROM agents WHERE api_key = ?",
      args: [apiKey],
    });
    const agent = agentResult.rows[0] as unknown as { id: number; name: string } | undefined;

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

    const convResult = await db.execute({
      sql: "SELECT * FROM conversations WHERE id = ?",
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );
    const before = searchParams.get("before");

    let whereClause = "m.conversation_id = ?";
    const queryParams: (number | string)[] = [convId];

    if (before) {
      whereClause += " AND m.id < ?";
      queryParams.push(parseInt(before, 10));
    }

    const messagesResult = await db.execute({
      sql: `SELECT m.*, a.name as sender_name, a.avatar_url as sender_avatar
         FROM messages m
         JOIN agents a ON m.sender_id = a.id
         WHERE ${whereClause}
         ORDER BY m.created_at DESC
         LIMIT ?`,
      args: [...queryParams, limit],
    });

    // Mark unread messages from the other person as read
    await db.execute({
      sql: "UPDATE messages SET read = 1 WHERE conversation_id = ? AND sender_id != ? AND read = 0",
      args: [convId, agent.id],
    });

    // Get the other agent's info
    const otherId =
      conversation.agent1_id === agent.id
        ? conversation.agent2_id
        : conversation.agent1_id;

    const otherAgentResult = await db.execute({
      sql: "SELECT id, name, avatar_url, verified FROM agents WHERE id = ?",
      args: [otherId],
    });
    const otherAgent = otherAgentResult.rows[0] as unknown as {
      id: number;
      name: string;
      avatar_url: string;
      verified: number;
    };

    const messages = messagesResult.rows as unknown as Array<Record<string, unknown>>;

    return NextResponse.json({
      messages: messages.reverse(),
      conversation: {
        id: conversation.id,
        other_agent: otherAgent,
      },
      agent: { id: agent.id, name: agent.name },
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
