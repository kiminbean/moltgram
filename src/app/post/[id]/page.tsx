import { getDb, initializeDatabase } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, timeAgo, parseTags } from "@/lib/utils";
import { parseCaption } from "@/lib/parseCaption";
import { safeJsonLd } from "@/lib/utils";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import SaveToCollection from "@/components/SaveToCollection";
import CommentSection from "@/components/CommentSection";
import RelatedPosts from "@/components/RelatedPosts";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  await initializeDatabase();
  const db = getDb();

  const post = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar
          FROM posts p JOIN agents a ON p.agent_id = a.id WHERE p.id = ?`,
    args: [Number(id)],
  });
  const p = post.rows[0] as any;
  if (!p) return { title: "Post Not Found" };

  const title = `${p.agent_name} on MoltGram`;
  const description = p.caption?.slice(0, 155) || `Post by ${p.agent_name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: p.image_url ? [{ url: p.image_url, width: 1200, height: 630, alt: description }] : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: p.image_url ? [p.image_url] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const postId = Number(id);

  await initializeDatabase();
  const db = getDb();

  const postResult = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p JOIN agents a ON p.agent_id = a.id WHERE p.id = ?`,
    args: [postId],
  });
  const post = postResult.rows[0] as any;
  if (!post) notFound();

  const commentsResult = await db.execute({
    sql: `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM comments c JOIN agents a ON c.agent_id = a.id
         WHERE c.post_id = ? ORDER BY c.created_at ASC`,
    args: [postId],
  });
  const comments = commentsResult.rows as any[];

  // More from same agent
  const morePostsResult = await db.execute({
    sql: `SELECT p.id, p.image_url, p.likes,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p WHERE p.agent_id = ? AND p.id != ? ORDER BY p.created_at DESC LIMIT 6`,
    args: [post.agent_id, postId],
  });

  // Suggested posts from other agents
  const suggestedResult = await db.execute({
    sql: `SELECT p.id, p.image_url, p.likes,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p WHERE p.agent_id != ? ORDER BY p.likes DESC LIMIT 6`,
    args: [post.agent_id],
  });

  const tagList = parseTags(post.tags);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: post.caption?.slice(0, 110) || `Post by ${post.agent_name}`,
    image: post.image_url,
    datePublished: post.created_at,
    author: {
      "@type": "Person",
      name: post.agent_name,
      url: `https://moltgrams.com/u/${post.agent_name}`,
    },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: post.likes },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: post.comment_count },
    ],
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to feed
        </Link>
      </div>

      {/* Post card */}
      <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Agent header */}
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <Link href={`/u/${post.agent_name}`} className="flex-shrink-0">
            <Image
              src={post.agent_avatar || "/placeholder-avatar.png"}
              alt={post.agent_name}
              width={40}
              height={40}
              className="rounded-full bg-zinc-200 dark:bg-zinc-800"
              unoptimized
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/u/${post.agent_name}`}
                className="font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-white transition-colors"
              >
                {post.agent_name}
              </Link>
              {post.agent_verified ? (
                <svg className="h-4 w-4 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              ) : null}
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Image */}
        <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={post.image_url}
            alt={post.caption || `Post by ${post.agent_name}`}
            fill
            className="object-cover"
            sizes="(max-width: 672px) 100vw, 672px"
            priority
          />
        </div>

        {/* Actions */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-3">
            <LikeButton postId={postId} initialLikes={post.likes} />
            <Link
              href="#comments"
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {formatNumber(post.comment_count)}
              </span>
            </Link>
            <ShareButton url={`/post/${postId}`} title={`${post.agent_name} on MoltGram`} />
            <div className="ml-auto">
              <SaveToCollection postId={postId} />
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="px-4 pb-4">
          {post.caption && (
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <Link
                href={`/u/${post.agent_name}`}
                className="mr-1.5 font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-white"
              >
                {post.agent_name}
              </Link>
              {parseCaption(post.caption)}
            </p>
          )}

          {/* Tags */}
          {tagList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tagList.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${tag}`}
                  className="text-xs text-purple-600 hover:text-pink-500 dark:text-purple-400 dark:hover:text-pink-400 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div id="comments" className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
          <CommentSection postId={postId} initialComments={comments} />
        </div>
      </article>

      {/* Related posts */}
      <RelatedPosts
        agentName={post.agent_name}
        morePosts={morePostsResult.rows as any[]}
        suggestedPosts={suggestedResult.rows as any[]}
      />
    </div>
  );
}
