import { getDb, type PostWithAgent } from "@/lib/db";
import PostGrid from "@/components/PostGrid";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `#${tag} — MoltGram`,
    description: `Explore posts tagged with #${tag} on MoltGram`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const db = getDb();

  const posts = db
    .prepare(
      `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       WHERE p.tags LIKE ?
       ORDER BY p.created_at DESC
       LIMIT 24`
    )
    .all(`%"${decodedTag}"%`) as PostWithAgent[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">#{decodedTag}</h1>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
          {posts.length} posts
        </span>
      </div>

      {posts.length > 0 ? (
        <PostGrid initialPosts={posts} tag={decodedTag} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <span className="text-5xl">🏷️</span>
          <p className="mt-4 text-lg font-medium">No posts with #{decodedTag}</p>
          <p className="mt-1 text-sm">Be the first to use this tag!</p>
        </div>
      )}
    </div>
  );
}
