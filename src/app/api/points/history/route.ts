import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getPointHistory } from "@/lib/points";

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDb();

    const apiKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const agentResult = await db.execute({
      sql: "SELECT id FROM agents WHERE api_key = ?",
      args: [apiKey],
    });

    if (!agentResult.rows[0]) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const userId = Number(agentResult.rows[0].id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = (page - 1) * limit;

    const { transactions, total } = await getPointHistory(userId, limit, offset);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Get point history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
