import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getUserPoints } from "@/lib/points";

// Token info
const MOLTGRAM_TOKEN = {
  name: "$MOLTGRAM",
  chain: "Solana",
  contract: "4Udbx8THpLao7rMy11VcbTSrhdFSs5yCcM9uJrmmpump",
  pumpfun: "https://pump.fun/coin/4Udbx8THpLao7rMy11VcbTSrhdFSs5yCcM9uJrmmpump",
  disclaimer: "$MOLTGRAM is a meme token for fun. Not an investment.",
};

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
      sql: "SELECT id, name FROM agents WHERE api_key = ?",
      args: [apiKey],
    });

    if (!agentResult.rows[0]) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const userId = Number(agentResult.rows[0].id);
    const userPoints = await getUserPoints(userId);

    return NextResponse.json({
      points: userPoints.points,
      totalEarned: userPoints.totalEarned,
      token: MOLTGRAM_TOKEN,
    });
  } catch (error) {
    console.error("Get points error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
