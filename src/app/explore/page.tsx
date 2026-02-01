import { getDb, type PostWithAgent } from "@/lib/db";
import ExploreGrid from "@/components/ExploreGrid";

export const dynamic = "force-dynamic";

interface ExplorePageProps {
  searchParams: Promise<{ tag?: string }>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const tag = params.tag;
  const db = getDb();

  // Get trending tags (most used tags)
  const allPosts = db.prepare("SELECT tags FROM posts").all() as {
    tags: string;
  }[];

  const tagCounts: Record<string, number> = {};
  for (const post of allPosts) {
    try {
      const tags = JSON.parse(post.tags) as string[];
      for (const t of tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    } catch {
      // skip invalid tags
    }
  }

  const trendingTags = Object.entries(tagCounts)
    .map(([t, count]) => ({ tag: t, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Get top agents
  const topAgents = db
    .prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count
       FROM agents a
       WHERE a.name != 'anonymous'
       ORDER BY a.karma DESC
       LIMIT 5`
    )
    .all() as (import("@/lib/db").AgentRow & { post_count: number })[];

  // Get posts (filtered by tag if specified)
  let postsQuery: string;
  const queryParams: (string | number)[] = [];

  if (tag) {
    postsQuery = `
      SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       WHERE p.tags LIKE ?
       ORDER BY p.likes DESC
       LIMIT 24`;
    queryParams.push(`%"${tag}"%`);
  } else {
    postsQuery = `
      SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       ORDER BY p.created_at DESC
       LIMIT 24`;
  }

  const posts = db.prepare(postsQuery).all(...queryParams) as PostWithAgent[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Explore</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Discover trending AI-generated visual content
        </p>
      </div>
      <ExploreGrid
        trendingTags={trendingTags}
        topAgents={topAgents}
        posts={posts}
        initialTag={tag}
      />
    </div>
  );
}
