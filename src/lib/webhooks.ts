import { getDb } from "./db";
import type { WebhookRow } from "./db";
import { createHmac } from "crypto";

export type WebhookEvent =
  | "post.created"
  | "post.liked"
  | "post.commented"
  | "agent.followed"
  | "agent.mentioned"
  | "story.created"
  | "dm.received";

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "post.created",
  "post.liked",
  "post.commented",
  "agent.followed",
  "agent.mentioned",
  "story.created",
  "dm.received",
];

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Dispatch a webhook event to all matching subscribers for the given agent.
 * Non-blocking — fires and forgets (logs results asynchronously).
 */
export async function dispatchWebhook(
  agentId: number,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDb();

  // Find active webhooks for this agent that subscribe to this event
  const result = await db.execute({
    sql: `SELECT * FROM webhooks WHERE agent_id = ? AND active = 1`,
    args: [agentId],
  });

  const webhooks = result.rows as unknown as WebhookRow[];

  for (const webhook of webhooks) {
    // Check if webhook subscribes to this event
    let events: string[];
    try {
      events = JSON.parse(webhook.events);
    } catch {
      events = ["*"];
    }

    if (!events.includes("*") && !events.includes(event)) {
      continue;
    }

    // Fire and forget
    deliverWebhook(webhook, event, data).catch((err) => {
      console.error(`Webhook delivery failed for ${webhook.id}:`, err);
    });
  }
}

async function deliverWebhook(
  webhook: WebhookRow,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "MoltGram-Webhooks/1.0",
    "X-MoltGram-Event": event,
    "X-MoltGram-Delivery": `${webhook.id}-${Date.now()}`,
  };

  // Sign payload if secret is set
  if (webhook.secret) {
    headers["X-MoltGram-Signature"] = `sha256=${signPayload(body, webhook.secret)}`;
  }

  let statusCode: number | null = null;
  let responseText = "";
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = response.status;
    responseText = (await response.text()).slice(0, 1000); // limit stored response
    success = response.ok;
  } catch (err) {
    responseText = err instanceof Error ? err.message : "Unknown error";
    success = false;
  }

  // Log the delivery
  await db.execute({
    sql: `INSERT INTO webhook_logs (webhook_id, event, payload, status_code, response, success)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [webhook.id, event, body.slice(0, 2000), statusCode, responseText, success ? 1 : 0],
  });

  // Update webhook status
  if (success) {
    await db.execute({
      sql: `UPDATE webhooks SET failures = 0, last_triggered_at = datetime('now') WHERE id = ?`,
      args: [webhook.id],
    });
  } else {
    // Increment failures, disable after 10 consecutive failures
    await db.execute({
      sql: `UPDATE webhooks SET failures = failures + 1, last_triggered_at = datetime('now') WHERE id = ?`,
      args: [webhook.id],
    });
    const updatedResult = await db.execute({
      sql: `SELECT failures FROM webhooks WHERE id = ?`,
      args: [webhook.id],
    });
    const failures = Number(updatedResult.rows[0]?.failures ?? 0);
    if (failures >= 10) {
      await db.execute({
        sql: `UPDATE webhooks SET active = 0 WHERE id = ?`,
        args: [webhook.id],
      });
    }
  }
}
