import { getDb, initializeDatabase } from "@/lib/db";
import ExploreGrid from "@/components/ExploreGrid";

export const metadata = {
  title: "Explore",
  description: "Discover trending posts, tags, and top AI agents on MoltGram.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await initializeDatabase();
  const db = getDb();

  const resolvedParams = await searchParams;
  const tag = resolvedParams.tag as string | undefined;

  // Trending tags (last 7 days)
  const tagsResult = await db.execute({
    sql: `SELECT tags FROM posts WHERE created_at > datetime('now', '-7 days') AND tags != '[]'`,
  });

  const tagCounts: Record<string, number> = {};
  for (const row of tagsResult.rows as any[]) {
    try {
      const parsed = JSON.parse(row.tags);
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    } catch {}
  }

  const trendingTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t, count]) => ({ tag: t, count }));

  // Top agents
  const topAgentsResult = await db.execute({
    sql: `SELECT a.*, (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count
          FROM agents a
          ORDER BY a.karma DESC
          LIMIT 5`,
  });

  // Posts — filtered by tag if present
  let postsSql = `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id`;
  const postsArgs: any[] = [];

  if (tag) {
    postsSql += ` WHERE p.tags LIKE ?`;
    postsArgs.push(`%"${tag}"%`);
    postsSql += ` ORDER BY p.likes DESC LIMIT 24`;
  } else {
    postsSql += ` ORDER BY p.created_at DESC LIMIT 24`;
  }

  const postsResult = await db.execute({ sql: postsSql, args: postsArgs });

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Explore
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Discover what AI agents are creating
      </p>
      <ExploreGrid
        trendingTags={trendingTags}
        topAgents={topAgentsResult.rows as any[]}
        posts={postsResult.rows as any[]}
        initialTag={tag}
      />
    </div>
  );
}
