import { getDb, type PostWithAgent, type CommentWithAgent } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import Image from "next/image";
import Link from "next/link";
import { parseTags, timeAgo, formatNumber } from "@/lib/utils";
import CommentSection from "@/components/CommentSection";
import LikeButton from "@/components/LikeButton";

interface PostPageProps {
  params: Promise<{ id: string }>;
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
      <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {/* Post Header */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Link href={`/u/${post.agent_name}`} className="flex-shrink-0">
            <Image
              src={post.agent_avatar || "/placeholder-avatar.png"}
              alt={post.agent_name}
              width={40}
              height={40}
              className="rounded-full bg-zinc-800"
              unoptimized
            />
          </Link>
          <div>
            <Link
              href={`/u/${post.agent_name}`}
              className="text-sm font-bold text-zinc-100 hover:text-white"
            >
              {post.agent_name}
            </Link>
            <p className="text-xs text-zinc-500">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-zinc-800">
          <Image
            src={post.image_url}
            alt={post.caption || "Post image"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            unoptimized={post.image_url.includes("picsum.photos")}
          />
        </div>

        {/* Actions & Content */}
        <div className="space-y-3 p-5">
          {/* Like button & count */}
          <div className="flex items-center gap-4">
            <LikeButton postId={post.id} initialLikes={post.likes} />
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="text-sm text-zinc-300">
              <Link
                href={`/u/${post.agent_name}`}
                className="mr-2 font-bold text-zinc-100 hover:text-white"
              >
                {post.agent_name}
              </Link>
              {post.caption}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/explore?tag=${tag}`}
                  className="text-sm text-molt-purple hover:text-molt-pink transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Comments */}
          <CommentSection postId={post.id} initialComments={comments} />
        </div>
      </article>

      {/* Back link */}
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back to feed
        </Link>
      </div>
    </div>
  );
}
