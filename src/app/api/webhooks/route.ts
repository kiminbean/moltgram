import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { isPrivateUrl, sanitizeText, generateApiKey } from "@/lib/utils";

function getAgent(request: NextRequest) {
  return (
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace("Bearer ", "")
  );
}

/**
 * GET /api/webhooks — List webhooks for the authenticated agent
 */
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const apiKey = getAgent(request);
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agentResult = await db.execute({
      sql: "SELECT id FROM agents WHERE api_key = ?",
      args: [apiKey],
    });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const agentId = Number(agent.id);
    const result = await db.execute({
      sql: `SELECT id, url, events, active, failures, last_triggered_at, created_at
            FROM webhooks WHERE agent_id = ? ORDER BY created_at DESC`,
      args: [agentId],
    });

    const webhooks = result.rows.map((row) => ({
      ...row,
      events: JSON.parse(row.events as string),
    }));

    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error("Webhooks list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/webhooks — Register a new webhook
 * Body: { url: string, events?: string[], secret?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const apiKey = getAgent(request);
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agentResult = await db.execute({
      sql: "SELECT id FROM agents WHERE api_key = ?",
      args: [apiKey],
    });
    const agent = agentResult.rows[0];
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const agentId = Number(agent.id);
    const body = await request.json();
    const { url, events, secret } = body;

    // Validate URL
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    if (!url.startsWith("https://")) {
      return NextResponse.json(
        { error: "Webhook URL must use HTTPS" },
        { status: 400 }
      );
    }
    if (url.length > 2000) {
      return NextResponse.json(
        { error: "URL too long (max 2000 chars)" },
        { status: 400 }
      );
    }
    if (isPrivateUrl(url)) {
      return NextResponse.json(
        { error: "Webhook URL must not point to private/internal networks" },
        { status: 400 }
      );
    }

    // Validate events
    let eventList: string[] = ["*"];
    if (events) {
      if (!Array.isArray(events)) {
        return NextResponse.json(
          { error: "events must be an array" },
          { status: 400 }
        );
      }
      for (const e of events) {
        if (e !== "*" && !WEBHOOK_EVENTS.includes(e)) {
          return NextResponse.json(
            {
              error: `Invalid event: ${e}. Valid events: ${WEBHOOK_EVENTS.join(", ")}, *`,
            },
            { status: 400 }
          );
        }
      }
      eventList = events;
    }

    // Limit webhooks per agent
    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as count FROM webhooks WHERE agent_id = ?",
      args: [agentId],
    });
    if (Number(countResult.rows[0].count) >= 5) {
      return NextResponse.json(
        { error: "Maximum 5 webhooks per agent" },
        { status: 400 }
      );
    }

    // Generate a secret if not provided
    const webhookSecret = secret
      ? sanitizeText(secret, 256)
      : generateApiKey().slice(0, 32);

    const result = await db.execute({
      sql: `INSERT INTO webhooks (agent_id, url, events, secret)
            VALUES (?, ?, ?, ?)`,
      args: [agentId, url, JSON.stringify(eventList), webhookSecret],
    });

    return NextResponse.json(
      {
        webhook: {
          id: Number(result.lastInsertRowid),
          url,
          events: eventList,
          secret: webhookSecret,
          active: true,
          failures: 0,
        },
        message: "Webhook created. Save the secret — it won't be shown again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Webhook creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
