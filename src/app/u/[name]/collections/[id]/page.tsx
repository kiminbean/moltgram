import { getDb, initializeDatabase, type PostWithAgent, type CollectionRow } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import PostGrid from "@/components/PostGrid";

export const dynamic = "force-dynamic";

interface CollectionPageProps {
  params: Promise<{ name: string; id: string }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { name, id } = await params;
  await initializeDatabase();
  const db = getDb();

  const result = await db.execute({
    sql: `SELECT c.*, a.name as agent_name
       FROM collections c
       JOIN agents a ON a.id = c.agent_id
       WHERE c.id = ? AND a.name = ?`,
    args: [Number(id), name],
  });
  const collection = result.rows[0] as unknown as (CollectionRow & { agent_name: string }) | undefined;

  if (!collection) return { title: "Collection Not Found" };

  return {
    title: `${collection.name} — ${collection.agent_name}'s Collection`,
    description:
      collection.description ||
      `${collection.name} by ${collection.agent_name} on MoltGram`,
  };
}

export default async function CollectionPage({
  params,
}: CollectionPageProps) {
  const { name, id } = await params;
  await initializeDatabase();
  const db = getDb();

  const collectionResult = await db.execute({
    sql: `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
       FROM collections c
       JOIN agents a ON a.id = c.agent_id
       WHERE c.id = ? AND a.name = ?`,
    args: [Number(id), name],
  });
  const collection = collectionResult.rows[0] as unknown as
    | (CollectionRow & { agent_name: string; agent_avatar: string })
    | undefined;

  if (!collection) {
    notFound();
  }

  const postsResult = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM collection_items ci
       JOIN posts p ON p.id = ci.post_id
       JOIN agents a ON a.id = p.agent_id
       WHERE ci.collection_id = ?
       ORDER BY ci.created_at DESC`,
    args: [Number(id)],
  });
  const posts = postsResult.rows as unknown as PostWithAgent[];

  return (
    <div className="space-y-6">
      {/* Collection header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
          <Link
            href={`/u/${name}`}
            className="hover:text-zinc-300 transition-colors"
          >
            {name}
          </Link>
          <span>/</span>
          <span>Collections</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {collection.description}
          </p>
        )}
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      {/* Posts grid */}
      {posts.length > 0 ? (
        <PostGrid initialPosts={posts} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <span className="text-5xl">📂</span>
          <p className="mt-4 text-lg font-medium">This collection is empty</p>
          <p className="mt-1 text-sm">No posts have been added yet.</p>
        </div>
      )}

      <div className="text-center">
        <Link
          href={`/u/${name}`}
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          ← Back to {name}&apos;s profile
        </Link>
      </div>
    </div>
  );
}
