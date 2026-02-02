import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const conversationId = Number(id);
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    let agentId: number | null = null;

    if (apiKey) {
      const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
      if (agentResult.rows[0]) agentId = Number(agentResult.rows[0].id);
    }

    const convResult = await db.execute({
      sql: `SELECT c.* FROM conversations c WHERE c.id = ?`,
      args: [conversationId],
    });
    const conversation = convResult.rows[0];

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (agentId) {
      if (Number(conversation.agent1_id) !== agentId && Number(conversation.agent2_id) !== agentId) {
        return NextResponse.json({ error: "You are not a participant in this conversation" }, { status: 403 });
      }
    }

    const messagesResult = await db.execute({
      sql: `SELECT m.*, a.name as sender_name, a.avatar_url as sender_avatar
         FROM messages m
         JOIN agents a ON m.sender_id = a.id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at ASC`,
      args: [conversationId],
    });

    const unreadResult = await db.execute({
      sql: "SELECT COUNT(*) as c FROM messages WHERE conversation_id = ? AND sender_id != ? AND read = 0",
      args: [conversationId, agentId || 0],
    });

    return NextResponse.json({
      messages: messagesResult.rows,
      unread_count: Number(unreadResult.rows[0].c),
    });
  } catch (error) {
    console.error("Conversation messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const conversationId = Number(id);
    const db = getDb();

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "Message content must be 2000 characters or less" }, { status: 400 });
    }

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    let agentId: number;

    if (apiKey) {
      const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
      if (!agentResult.rows[0]) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
      agentId = Number(agentResult.rows[0].id);
    } else {
      const anonResult = await db.execute({ sql: "SELECT id FROM agents WHERE name = 'anonymous'", args: [] });
      if (anonResult.rows.length === 0) {
        const result = await db.execute({
          sql: "INSERT INTO agents (name, description, api_key, avatar_url) VALUES ('anonymous', 'Anonymous viewer', 'anon_internal_key', '')",
          args: [],
        });
        agentId = Number(result.lastInsertRowid);
      } else {
        agentId = Number(anonResult.rows[0].id);
      }
    }

    const convResult = await db.execute({
      sql: "SELECT agent1_id, agent2_id FROM conversations WHERE id = ?",
      args: [conversationId],
    });
    const conversation = convResult.rows[0];

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const otherAgentId = Number(conversation.agent1_id) === agentId ? Number(conversation.agent2_id) : Number(conversation.agent1_id);

    const result = await db.execute({
      sql: "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
      args: [conversationId, agentId, content.trim()],
    });

    await db.execute({
      sql: "UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?",
      args: [conversationId],
    });

    await db.execute({
      sql: "UPDATE messages SET read = 1 WHERE conversation_id = ? AND sender_id = ?",
      args: [conversationId, otherAgentId],
    });

    await db.execute({
      sql: "INSERT INTO notifications (agent_id, type, from_agent_id) VALUES (?, 'message', ?)",
      args: [otherAgentId, agentId],
    });

    const messageResult = await db.execute({
      sql: `SELECT m.*, a.name as sender_name, a.avatar_url as sender_avatar
         FROM messages m
         JOIN agents a ON m.sender_id = a.id
         WHERE m.id = ?`,
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json(
      { success: true, message: messageResult.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
