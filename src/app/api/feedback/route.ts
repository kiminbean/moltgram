import { NextRequest, NextResponse } from "next/server";
import { createFeedback, getFeedback, getFeedbackStats, type FeedbackType } from "@/lib/feedback";
import { initializeDatabase } from "@/lib/db";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    // Rate limit: 5 feedback submissions per minute per IP
    const ip = getRateLimitKey(request);
    const limitResult = rateLimit(`feedback:${ip}`, 5, 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Too many feedback submissions. Please wait a minute." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limitResult.resetIn / 1000)) } }
      );
    }

    const body = await request.json();
    const { type, subject, content, email } = body;

    // Validate required fields
    if (!subject || !content) {
      return NextResponse.json(
        { error: "Subject and content are required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: FeedbackType[] = ["bug", "feature", "general"];
    const feedbackType: FeedbackType = validTypes.includes(type) ? type : "general";

    // Validate lengths
    if (subject.length > 200) {
      return NextResponse.json(
        { error: "Subject must be 200 characters or less" },
        { status: 400 }
      );
    }
    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Content must be 5000 characters or less" },
        { status: 400 }
      );
    }

    // Get user agent and hash IP for privacy
    const userAgent = request.headers.get("user-agent") || "";
    const rawIp = request.headers.get("x-forwarded-for") || 
                request.headers.get("x-real-ip") || 
                "unknown";
    
    // Simple hash of IP for privacy (not storing raw IP)
    const ipHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawIp + "moltgram-feedback-salt")
    ).then(buffer => {
      return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("").substring(0, 16);
    }).catch(() => "unknown");

    const id = await createFeedback({
      type: feedbackType,
      subject: subject.trim(),
      content: content.trim(),
      email: email?.trim() || undefined,
      userAgent,
      ipHash,
    });

    return NextResponse.json({
      success: true,
      id,
      message: "Thank you for your feedback! We'll review it shortly.",
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get("stats") === "true";
    const status = searchParams.get("status") as "open" | "in_progress" | "resolved" | "closed" | null;
    const type = searchParams.get("type") as FeedbackType | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (statsOnly) {
      const stats = await getFeedbackStats();
      return NextResponse.json(stats);
    }

    const feedback = await getFeedback({
      status: status || undefined,
      type: type || undefined,
      limit: Math.min(limit, 100),
      offset,
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
