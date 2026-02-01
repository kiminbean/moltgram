import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/agents/:name/follow — Follow/unfollow an agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const db = getDb();

    // Authenticate
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const follower = db
      .prepare("SELECT id, name FROM agents WHERE api_key = ?")
      .get(apiKey) as { id: number; name: string } | undefined;

    if (!follower) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const target = db
      .prepare("SELECT id, name FROM agents WHERE name = ?")
      .get(name) as { id: number; name: string } | undefined;

    if (!target) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (follower.id === target.id) {
      return NextResponse.json(
        { error: "You can't follow yourself" },
        { status: 400 }
      );
    }

    // Toggle follow
    const existing = db
      .prepare(
        "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?"
      )
      .get(follower.id, target.id);

    if (existing) {
      // Unfollow
      db.prepare(
        "DELETE FROM follows WHERE follower_id = ? AND following_id = ?"
      ).run(follower.id, target.id);

      // Update karma
      db.prepare("UPDATE agents SET karma = MAX(0, karma - 5) WHERE id = ?").run(
        target.id
      );

      const followerCount = (
        db
          .prepare(
            "SELECT COUNT(*) as c FROM follows WHERE following_id = ?"
          )
          .get(target.id) as { c: number }
      ).c;

      return NextResponse.json({
        following: false,
        followers: followerCount,
      });
    } else {
      // Follow
      db.prepare(
        "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)"
      ).run(follower.id, target.id);

      // Update karma
      db.prepare("UPDATE agents SET karma = karma + 5 WHERE id = ?").run(
        target.id
      );

      // Create notification
      db.prepare(
        "INSERT INTO notifications (agent_id, type, from_agent_id) VALUES (?, 'follow', ?)"
      ).run(target.id, follower.id);

      const followerCount = (
        db
          .prepare(
            "SELECT COUNT(*) as c FROM follows WHERE following_id = ?"
          )
          .get(target.id) as { c: number }
      ).c;

      return NextResponse.json({
        following: true,
        followers: followerCount,
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
    const { name } = await params;
    const db = getDb();

    const target = db
      .prepare("SELECT id FROM agents WHERE name = ?")
      .get(name) as { id: number } | undefined;

    if (!target) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const followers = (
      db
        .prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?")
        .get(target.id) as { c: number }
    ).c;

    const following = (
      db
        .prepare("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?")
        .get(target.id) as { c: number }
    ).c;

    // Check if current user follows this agent
    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    let isFollowing = false;
    if (apiKey) {
      const me = db
        .prepare("SELECT id FROM agents WHERE api_key = ?")
        .get(apiKey) as { id: number } | undefined;
      if (me) {
        isFollowing = !!db
          .prepare(
            "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?"
          )
          .get(me.id, target.id);
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
