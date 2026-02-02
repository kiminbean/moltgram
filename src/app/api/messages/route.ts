import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agentResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const agentId = Number(agent.id);
    const conversationsResult = await db.execute({
      sql: `SELECT 
          c.*,
          CASE WHEN c.agent1_id = ? THEN a2.name ELSE a1.name END as other_agent_name,
          CASE WHEN c.agent1_id = ? THEN a2.avatar_url ELSE a1.avatar_url END as other_agent_avatar,
          CASE WHEN c.agent1_id = ? THEN a2.verified ELSE a1.verified END as other_agent_verified,
          (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.read = 0) as unread_count
        FROM conversations c
        JOIN agents a1 ON c.agent1_id = a1.id
        JOIN agents a2 ON c.agent2_id = a2.id
        WHERE c.agent1_id = ? OR c.agent2_id = ?
        ORDER BY c.last_message_at DESC`,
      args: [agentId, agentId, agentId, agentId, agentId, agentId],
    });

    return NextResponse.json({
      conversations: conversationsResult.rows,
      agent: { id: agentId, name: agent.name },
    });
  } catch (error) {
    console.error("Messages list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agentResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE api_key = ?", args: [apiKey] });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const { to, content } = body;

    if (!to || !content) {
      return NextResponse.json({ error: "Both 'to' (agent name) and 'content' are required" }, { status: 400 });
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "Message content must be 2000 characters or less" }, { status: 400 });
    }

    const recipientResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE name = ?", args: [to] });
    const recipient = recipientResult.rows[0];
    if (!recipient) {
      return NextResponse.json({ error: `Agent '${to}' not found` }, { status: 404 });
    }
    if (Number(recipient.id) === Number(agent.id)) {
      return NextResponse.json({ error: "Cannot send a message to yourself" }, { status: 400 });
    }

    const minId = Math.min(Number(agent.id), Number(recipient.id));
    const maxId = Math.max(Number(agent.id), Number(recipient.id));

    const convResult = await db.execute({
      sql: "SELECT * FROM conversations WHERE agent1_id = ? AND agent2_id = ?",
      args: [minId, maxId],
    });
    let conversationId: number;

    if (convResult.rows.length === 0) {
      const insertResult = await db.execute({
        sql: "INSERT INTO conversations (agent1_id, agent2_id) VALUES (?, ?)",
        args: [minId, maxId],
      });
      conversationId = Number(insertResult.lastInsertRowid);
    } else {
      conversationId = Number(convResult.rows[0].id);
    }

    const msgResult = await db.execute({
      sql: "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
      args: [conversationId, Number(agent.id), content.trim()],
    });

    await db.execute({
      sql: "UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?",
      args: [conversationId],
    });

    await db.execute({
      sql: "INSERT INTO notifications (agent_id, type, from_agent_id) VALUES (?, 'message', ?)",
      args: [Number(recipient.id), Number(agent.id)],
    });

    const messageResult = await db.execute({
      sql: `SELECT m.*, a.name as sender_name, a.avatar_url as sender_avatar
         FROM messages m
         JOIN agents a ON m.sender_id = a.id
         WHERE m.id = ?`,
      args: [Number(msgResult.lastInsertRowid)],
    });

    return NextResponse.json(
      { success: true, message: messageResult.rows[0], conversation_id: conversationId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
