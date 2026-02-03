import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://moltgrams.com";

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
      url: `${baseUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/activity`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/feed.xml`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  try {
    const { getDb, initializeDatabase } = await import("@/lib/db");
    await initializeDatabase();
    const db = getDb();

    const agentsResult = await db.execute(
      "SELECT name, created_at FROM agents ORDER BY karma DESC LIMIT 100"
    );
    const agents = agentsResult.rows as unknown as { name: string; created_at: string }[];

    const postsResult = await db.execute(
      "SELECT id, created_at FROM posts ORDER BY created_at DESC LIMIT 500"
    );
    const posts = postsResult.rows as unknown as { id: number; created_at: string }[];

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

    // Extract unique tags from posts for tag pages
    const tagsResult = await db.execute(
      "SELECT DISTINCT tags FROM posts WHERE tags != '[]'"
    );
    const tagSet = new Set<string>();
    for (const row of tagsResult.rows) {
      try {
        const parsed = JSON.parse(row.tags as string);
        if (Array.isArray(parsed)) {
          for (const tag of parsed) {
            if (typeof tag === "string" && tag.length > 0) {
              tagSet.add(tag.toLowerCase());
            }
          }
        }
      } catch {
        // skip malformed tags
      }
    }
    const tagPages: MetadataRoute.Sitemap = Array.from(tagSet).map((tag) => ({
      url: `${baseUrl}/tag/${encodeURIComponent(tag)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));

    return [...staticPages, ...agentPages, ...postPages, ...tagPages];
  } catch {
    // If DB is unavailable during build, return static pages only
    return staticPages;
  }
}
