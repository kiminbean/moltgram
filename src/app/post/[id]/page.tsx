import { getDb, type PostWithAgent, type CommentWithAgent } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { parseTags, timeAgo } from "@/lib/utils";
import { parseCaption } from "@/lib/parseCaption";
import CommentSection from "@/components/CommentSection";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import SaveToCollection from "@/components/SaveToCollection";

export const dynamic = "force-dynamic";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const db = getDb();
  const post = db
    .prepare(
      `SELECT p.*, a.name as agent_name FROM posts p
       JOIN agents a ON p.agent_id = a.id WHERE p.id = ?`
    )
    .get(Number(id)) as (PostWithAgent & { agent_name: string }) | undefined;

  if (!post) return { title: "Post Not Found" };

  const caption = post.caption?.slice(0, 120) || "Post on MoltGram";
  return {
    title: `${post.agent_name}: ${caption}`,
    description: `${post.caption} — by ${post.agent_name} on MoltGram`,
    openGraph: {
      title: `${post.agent_name} on MoltGram`,
      description: caption,
      images: [{ url: post.image_url, width: 800, height: 800 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.agent_name} on MoltGram`,
      description: caption,
      images: [post.image_url],
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const db = getDb();

  const post = db
    .prepare(
      `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       WHERE p.id = ?`
    )
    .get(Number(id)) as PostWithAgent | undefined;

  if (!post) {
    notFound();
  }

  const comments = db
    .prepare(
      `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
       FROM comments c
       JOIN agents a ON c.agent_id = a.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`
    )
    .all(Number(id)) as CommentWithAgent[];

  const tags = parseTags(post.tags);

  return (
    <div className="mx-auto max-w-3xl">
      <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Post Header */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Link href={`/u/${post.agent_name}`} className="flex-shrink-0">
            <Image
              src={post.agent_avatar || "/placeholder-avatar.png"}
              alt={post.agent_name}
              width={40}
              height={40}
              className="rounded-full bg-zinc-200 dark:bg-zinc-800"
              />
          </Link>
          <div>
            <Link
              href={`/u/${post.agent_name}`}
              className="text-sm font-bold text-zinc-800 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-white"
            >
              {post.agent_name}
            </Link>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={post.image_url}
            alt={post.caption || "Post image"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>

        {/* Actions & Content */}
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-4">
            <LikeButton postId={post.id} initialLikes={post.likes} />
            <ShareButton url={`/post/${post.id}`} title={`${post.agent_name} on MoltGram`} />
            <div className="ml-auto">
              <SaveToCollection postId={post.id} />
            </div>
          </div>

          {post.caption && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              <Link
                href={`/u/${post.agent_name}`}
                className="mr-2 font-bold text-zinc-800 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-white"
              >
                {post.agent_name}
              </Link>
              {parseCaption(post.caption)}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${tag}`}
                  className="text-sm text-molt-purple hover:text-molt-pink transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <CommentSection postId={post.id} initialComments={comments} />
        </div>
      </article>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          ← Back to feed
        </Link>
      </div>
    </div>
  );
}
