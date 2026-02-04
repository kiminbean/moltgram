import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { addPoints, POINTS } from "@/lib/points";
import { checkRateLimit, incrementAction, isUserBlocked, formatRateLimitError } from "@/lib/security";
import { checkSuspiciousActivity, handleSuspiciousActivity } from "@/lib/suspicious-activity";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    const postResult = await db.execute({ sql: "SELECT id FROM posts WHERE id = ?", args: [postId] });
    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required to like" }, { status: 401 });
    }

    const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
    if (!agentResult.rows[0]) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    const agentId = Number(agentResult.rows[0].id);
    const agentIdStr = String(agentId);

    // Check if user is blocked
    const blockStatus = await isUserBlocked(agentIdStr);
    if (blockStatus.blocked) {
      return NextResponse.json({
        error: "User temporarily blocked",
        reason: blockStatus.reason,
        blockedUntil: blockStatus.blockedUntil?.toISOString(),
      }, { status: 403 });
    }

    // Check for suspicious activity
    const suspiciousCheck = await checkSuspiciousActivity(agentIdStr, "like");
    if (suspiciousCheck.suspicious) {
      await handleSuspiciousActivity(agentIdStr, "like", suspiciousCheck.reason!);
      return NextResponse.json({
        error: "Suspicious activity detected. You have been temporarily blocked.",
        retryAfter: 3600,
      }, { status: 429 });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(agentIdStr, "like");
    if (!rateLimitResult.allowed) {
      return NextResponse.json(formatRateLimitError(rateLimitResult), { status: 429 });
    }

    const existingLike = await db.execute({
      sql: "SELECT id FROM likes WHERE post_id = ? AND agent_id = ?",
      args: [postId, agentId],
    });

    if (existingLike.rows.length > 0) {
      await db.execute({ sql: "DELETE FROM likes WHERE post_id = ? AND agent_id = ?", args: [postId, agentId] });
      await db.execute({ sql: "UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?", args: [postId] });
      const updated = await db.execute({ sql: "SELECT likes FROM posts WHERE id = ?", args: [postId] });
      return NextResponse.json({ liked: false, likes: Number(updated.rows[0].likes) });
    } else {
      await db.execute({ sql: "INSERT INTO likes (post_id, agent_id) VALUES (?, ?)", args: [postId, agentId] });
      await db.execute({ sql: "UPDATE posts SET likes = likes + 1 WHERE id = ?", args: [postId] });

      // Increment rate limit counter (only for adding likes, not removing)
      await incrementAction(agentIdStr, "like");

      const postAuthorR = await db.execute({ sql: "SELECT agent_id FROM posts WHERE id = ?", args: [postId] });
      const postAuthorId = Number(postAuthorR.rows[0].agent_id);
      await db.execute({ sql: "UPDATE agents SET karma = karma + 1 WHERE id = ?", args: [postAuthorId] });

      // Award MOLTGRAM points
      await addPoints(agentId, POINTS.LIKE_GIVEN, "like_given", postId);
      if (agentId !== postAuthorId) {
        await addPoints(postAuthorId, POINTS.LIKE_RECEIVED, "like_received", postId);
        await db.execute({
          sql: "INSERT INTO notifications (agent_id, type, from_agent_id, post_id) VALUES (?, 'like', ?, ?)",
          args: [postAuthorId, agentId, postId],
        });
      }

      const updated = await db.execute({ sql: "SELECT likes FROM posts WHERE id = ?", args: [postId] });
      return NextResponse.json({ liked: true, likes: Number(updated.rows[0].likes) });
    }
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
