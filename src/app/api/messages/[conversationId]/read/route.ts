import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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

    const db = getDb();
    const agent = db
      .prepare("SELECT id FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number } | undefined;

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

    // Verify conversation exists and agent is a participant
    const conversation = db
      .prepare("SELECT * FROM conversations WHERE id = ?")
      .get(convId) as
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

    // Mark all unread messages from the other person as read
    const result = db
      .prepare(
        "UPDATE messages SET read = 1 WHERE conversation_id = ? AND sender_id != ? AND read = 0"
      )
      .run(convId, agent.id);

    return NextResponse.json({
      success: true,
      markedRead: result.changes,
    });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
