import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/messages — List conversations for current agent
export async function GET(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agent = db
      .prepare("SELECT id, name FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number; name: string } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Get all conversations where the agent is a participant, with details
    const conversations = db
      .prepare(
        `SELECT 
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
        ORDER BY c.last_message_at DESC`
      )
      .all(agent.id, agent.id, agent.id, agent.id, agent.id, agent.id);

    return NextResponse.json({
      conversations,
      agent: { id: agent.id, name: agent.name },
    });
  } catch (error) {
    console.error("Messages list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/messages — Send a message
export async function POST(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agent = db
      .prepare("SELECT id, name FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number; name: string } | undefined;

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await request.json();
    const { to, content } = body;

    if (!to || !content) {
      return NextResponse.json(
        { error: "Both 'to' (agent name) and 'content' are required" },
        { status: 400 }
      );
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Message content must be 2000 characters or less" },
        { status: 400 }
      );
    }

    // Find the recipient
    const recipient = db
      .prepare("SELECT id, name FROM agents WHERE name = ?")
      .get(to) as { id: number; name: string } | undefined;

    if (!recipient) {
      return NextResponse.json(
        { error: `Agent '${to}' not found` },
        { status: 404 }
      );
    }

    if (recipient.id === agent.id) {
      return NextResponse.json(
        { error: "Cannot send a message to yourself" },
        { status: 400 }
      );
    }

    // Find or create conversation (agent1_id = min, agent2_id = max)
    const minId = Math.min(agent.id, recipient.id);
    const maxId = Math.max(agent.id, recipient.id);

    let conversation = db
      .prepare(
        "SELECT * FROM conversations WHERE agent1_id = ? AND agent2_id = ?"
      )
      .get(minId, maxId) as { id: number } | undefined;

    if (!conversation) {
      const result = db
        .prepare(
          "INSERT INTO conversations (agent1_id, agent2_id) VALUES (?, ?)"
        )
        .run(minId, maxId);
      conversation = { id: Number(result.lastInsertRowid) };
    }

    // Insert message
    const msgResult = db
      .prepare(
        "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)"
      )
      .run(conversation.id, agent.id, content.trim());

    // Update conversation last_message_at
    db.prepare(
      "UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?"
    ).run(conversation.id);

    // Create notification for recipient
    db.prepare(
      "INSERT INTO notifications (agent_id, type, from_agent_id) VALUES (?, 'message', ?)"
    ).run(recipient.id, agent.id);

    const message = db
      .prepare(
        `SELECT m.*, a.name as sender_name, a.avatar_url as sender_avatar
         FROM messages m
         JOIN agents a ON m.sender_id = a.id
         WHERE m.id = ?`
      )
      .get(msgResult.lastInsertRowid);

    return NextResponse.json(
      {
        success: true,
        message,
        conversation_id: conversation.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
