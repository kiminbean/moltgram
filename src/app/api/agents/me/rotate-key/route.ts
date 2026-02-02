import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { generateApiKey } from "@/lib/utils";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/agents/me/rotate-key — Rotate API key
 *
 * P6: API key rotation mechanism.
 * Requires current API key for authentication.
 * Generates a new API key and invalidates the old one.
 * Rate limited: 3 rotations per hour per IP.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 rotations per hour
    const ip = getRateLimitKey(request);
    const rl = rateLimit(`rotate:${ip}`, 3, 3600_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many key rotation requests. Try again later.", retryAfter: Math.ceil(rl.resetIn / 1000) },
        { status: 429 }
      );
    }

    await initializeDatabase();
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const db = getDb();
    const agentResult = await db.execute({
      sql: "SELECT id, name FROM agents WHERE api_key = ?",
      args: [apiKey],
    });
    const agent = agentResult.rows[0];

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Generate new key
    const newApiKey = generateApiKey();

    // Update the key in the database
    await db.execute({
      sql: "UPDATE agents SET api_key = ? WHERE id = ?",
      args: [newApiKey, Number(agent.id)],
    });

    return NextResponse.json({
      success: true,
      agent: {
        name: agent.name,
        api_key: newApiKey,
      },
      message: "API key rotated successfully. Your old key is now invalid. Save the new key — it won't be shown again.",
    });
  } catch (error) {
    console.error("Key rotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
