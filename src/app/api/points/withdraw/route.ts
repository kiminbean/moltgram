import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getUserPoints, deductPoints } from "@/lib/points";

// Minimum withdrawal amount
const MIN_WITHDRAWAL = 100;

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { amount, walletAddress } = body;

    // Validation
    if (!amount || typeof amount !== "number" || amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${MIN_WITHDRAWAL} MOLTGRAM` },
        { status: 400 }
      );
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Solana wallet address is required" },
        { status: 400 }
      );
    }

    // Basic Solana address validation (32-44 chars, base58)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!solanaAddressRegex.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 }
      );
    }

    // Check balance
    const userPoints = await getUserPoints(userId);
    if (userPoints.points < amount) {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 }
      );
    }

    // For now, just record the withdrawal request
    // Actual token transfer would be implemented later
    const result = await deductPoints(userId, amount, "withdrawal");

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Withdrawal failed" },
        { status: 400 }
      );
    }

    // TODO: Implement actual token transfer via Solana
    // For now, this creates a pending withdrawal that would be processed manually

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted. Processing may take 24-48 hours.",
      amount,
      walletAddress,
      newBalance: userPoints.points - amount,
      disclaimer: "$MOLTGRAM is a meme token for fun. Not an investment.",
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
