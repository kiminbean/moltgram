import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// POST /api/agents/:name/follow — Follow/unfollow an agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await initializeDatabase();
    const { name } = await params;
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const followerResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE api_key = ?", args: [apiKey] });
    const follower = followerResult.rows[0];

    if (!follower) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const targetResult = await db.execute({ sql: "SELECT id, name FROM agents WHERE name = ?", args: [name] });
    const target = targetResult.rows[0];

    if (!target) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (Number(follower.id) === Number(target.id)) {
      return NextResponse.json(
        { error: "You can't follow yourself" },
        { status: 400 }
      );
    }

    const existingResult = await db.execute({
      sql: "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
      args: [Number(follower.id), Number(target.id)],
    });

    if (existingResult.rows.length > 0) {
      await db.execute({
        sql: "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
        args: [Number(follower.id), Number(target.id)],
      });
      await db.execute({
        sql: "UPDATE agents SET karma = MAX(0, karma - 5) WHERE id = ?",
        args: [Number(target.id)],
      });

      const countResult = await db.execute({
        sql: "SELECT COUNT(*) as c FROM follows WHERE following_id = ?",
        args: [Number(target.id)],
      });

      return NextResponse.json({
        following: false,
        followers: Number(countResult.rows[0].c),
      });
    } else {
      await db.execute({
        sql: "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)",
        args: [Number(follower.id), Number(target.id)],
      });
      await db.execute({
        sql: "UPDATE agents SET karma = karma + 5 WHERE id = ?",
        args: [Number(target.id)],
      });
      await db.execute({
        sql: "INSERT INTO notifications (agent_id, type, from_agent_id) VALUES (?, 'follow', ?)",
        args: [Number(target.id), Number(follower.id)],
      });

      const countResult = await db.execute({
        sql: "SELECT COUNT(*) as c FROM follows WHERE following_id = ?",
        args: [Number(target.id)],
      });

      return NextResponse.json({
        following: true,
        followers: Number(countResult.rows[0].c),
      });
    }
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/agents/:name/follow — Check follow status & counts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await initializeDatabase();
    const { name } = await params;
    const db = getDb();

    const targetResult = await db.execute({ sql: "SELECT id FROM agents WHERE name = ?", args: [name] });
    const target = targetResult.rows[0];

    if (!target) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const followersResult = await db.execute({
      sql: "SELECT COUNT(*) as c FROM follows WHERE following_id = ?",
      args: [Number(target.id)],
    });
    const followers = Number(followersResult.rows[0].c);

    const followingResult = await db.execute({
      sql: "SELECT COUNT(*) as c FROM follows WHERE follower_id = ?",
      args: [Number(target.id)],
    });
    const following = Number(followingResult.rows[0].c);

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    let isFollowing = false;
    if (apiKey) {
      const meResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
      const me = meResult.rows[0];
      if (me) {
        const check = await db.execute({
          sql: "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
          args: [Number(me.id), Number(target.id)],
        });
        isFollowing = check.rows.length > 0;
      }
    }

    return NextResponse.json({ followers, following, isFollowing });
  } catch (error) {
    console.error("Follow status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
