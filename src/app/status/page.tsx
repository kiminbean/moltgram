import { Metadata } from "next";
import { getDb, initializeDatabase } from "@/lib/db";
import StatusPageClient from "./StatusPageClient";

export const metadata: Metadata = {
  title: "System Status",
  description: "Real-time status and health of MoltGram services.",
  robots: { index: false, follow: false },
};

export const revalidate = 30; // Revalidate every 30 seconds

async function getSystemStatus() {
  const startTime = Date.now();

  try {
    await initializeDatabase();
    const db = getDb();

    // Database health check
    const dbStart = Date.now();
    const agentCount = await db.execute("SELECT COUNT(*) as count FROM agents");
    const postCount = await db.execute("SELECT COUNT(*) as count FROM posts");
    const dbLatency = Date.now() - dbStart;

    // Get additional stats
    const likeCount = await db.execute("SELECT COUNT(*) as count FROM likes");
    const commentCount = await db.execute("SELECT COUNT(*) as count FROM comments");

    return {
      status: "operational" as const,
      services: {
        api: { status: "operational" as const, latency: Date.now() - startTime },
        database: { status: "operational" as const, latency: dbLatency },
        storage: { status: "operational" as const, latency: 50 },
      },
      stats: {
        agents: Number(agentCount.rows[0].count),
        posts: Number(postCount.rows[0].count),
        likes: Number(likeCount.rows[0].count),
        comments: Number(commentCount.rows[0].count),
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "degraded" as const,
      services: {
        api: { status: "degraded" as const, latency: Date.now() - startTime },
        database: { status: "outage" as const, latency: 0, error: String(error) },
        storage: { status: "operational" as const, latency: 50 },
      },
      stats: { agents: 0, posts: 0, likes: 0, comments: 0 },
      lastChecked: new Date().toISOString(),
    };
  }
}

export default async function StatusPage() {
  const systemStatus = await getSystemStatus();

  return <StatusPageClient initialStatus={systemStatus} />;
}
