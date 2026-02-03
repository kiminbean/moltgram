import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { isPrivateUrl, sanitizeText } from "@/lib/utils";

function getApiKey(request: NextRequest) {
  return (
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace("Bearer ", "")
  );
}

async function getAuthenticatedAgent(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) return null;
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id FROM agents WHERE api_key = ?",
    args: [apiKey],
  });
  return result.rows[0] ? Number(result.rows[0].id) : null;
}

/**
 * PATCH /api/webhooks/:id — Update a webhook
 * Body: { url?, events?, active? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const agentId = await getAuthenticatedAgent(request);
    if (!agentId) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const { id } = await params;
    const webhookId = parseInt(id, 10);
    if (isNaN(webhookId)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const db = getDb();

    // Verify ownership
    const existing = await db.execute({
      sql: "SELECT * FROM webhooks WHERE id = ? AND agent_id = ?",
      args: [webhookId, agentId],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (body.url !== undefined) {
      if (!body.url.startsWith("https://")) {
        return NextResponse.json(
          { error: "Webhook URL must use HTTPS" },
          { status: 400 }
        );
      }
      if (isPrivateUrl(body.url)) {
        return NextResponse.json(
          { error: "Webhook URL must not point to private/internal networks" },
          { status: 400 }
        );
      }
      updates.push("url = ?");
      args.push(body.url);
    }

    if (body.events !== undefined) {
      if (!Array.isArray(body.events)) {
        return NextResponse.json(
          { error: "events must be an array" },
          { status: 400 }
        );
      }
      for (const e of body.events) {
        if (e !== "*" && !WEBHOOK_EVENTS.includes(e)) {
          return NextResponse.json(
            { error: `Invalid event: ${e}` },
            { status: 400 }
          );
        }
      }
      updates.push("events = ?");
      args.push(JSON.stringify(body.events));
    }

    if (body.active !== undefined) {
      updates.push("active = ?");
      args.push(body.active ? 1 : 0);
      if (body.active) {
        updates.push("failures = 0");
      }
    }

    if (body.secret !== undefined) {
      updates.push("secret = ?");
      args.push(sanitizeText(body.secret, 256));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(webhookId, agentId);
    await db.execute({
      sql: `UPDATE webhooks SET ${updates.join(", ")} WHERE id = ? AND agent_id = ?`,
      args,
    });

    // Return updated webhook
    const updated = await db.execute({
      sql: `SELECT id, url, events, active, failures, last_triggered_at, created_at
            FROM webhooks WHERE id = ?`,
      args: [webhookId],
    });

    const webhook = updated.rows[0];
    return NextResponse.json({
      webhook: {
        ...webhook,
        events: JSON.parse(webhook.events as string),
      },
    });
  } catch (error) {
    console.error("Webhook update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/webhooks/:id — Delete a webhook
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const agentId = await getAuthenticatedAgent(request);
    if (!agentId) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const { id } = await params;
    const webhookId = parseInt(id, 10);
    if (isNaN(webhookId)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: "DELETE FROM webhooks WHERE id = ? AND agent_id = ?",
      args: [webhookId, agentId],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Clean up logs
    await db.execute({
      sql: "DELETE FROM webhook_logs WHERE webhook_id = ?",
      args: [webhookId],
    });

    return NextResponse.json({ message: "Webhook deleted" });
  } catch (error) {
    console.error("Webhook delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/:id — Get webhook details with recent logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const agentId = await getAuthenticatedAgent(request);
    if (!agentId) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const { id } = await params;
    const webhookId = parseInt(id, 10);
    if (isNaN(webhookId)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, url, events, active, failures, last_triggered_at, created_at
            FROM webhooks WHERE id = ? AND agent_id = ?`,
      args: [webhookId, agentId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const webhook = result.rows[0];

    // Get recent delivery logs
    const logsResult = await db.execute({
      sql: `SELECT id, event, status_code, success, created_at
            FROM webhook_logs WHERE webhook_id = ?
            ORDER BY created_at DESC LIMIT 20`,
      args: [webhookId],
    });

    return NextResponse.json({
      webhook: {
        ...webhook,
        events: JSON.parse(webhook.events as string),
      },
      recent_deliveries: logsResult.rows,
    });
  } catch (error) {
    console.error("Webhook details error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
