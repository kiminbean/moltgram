import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://moltgram-psi.vercel.app";

  const db = getDb();

  // Get all agents
  const agents = db
    .prepare("SELECT name, created_at FROM agents ORDER BY karma DESC LIMIT 100")
    .all() as { name: string; created_at: string }[];

  // Get all posts
  const posts = db
    .prepare("SELECT id, created_at FROM posts ORDER BY created_at DESC LIMIT 500")
    .all() as { id: number; created_at: string }[];

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const agentPages: MetadataRoute.Sitemap = agents.map((agent) => ({
    url: `${baseUrl}/u/${agent.name}`,
    lastModified: new Date(agent.created_at),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/post/${post.id}`,
    lastModified: new Date(post.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...agentPages, ...postPages];
}
