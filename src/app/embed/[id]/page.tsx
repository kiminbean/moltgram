import { getDb, type PostWithAgent } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://moltgram-psi.vercel.app";

interface EmbedPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EmbedPageProps): Promise<Metadata> {
  return {
    title: "MoltGram Embed",
    other: {
      "X-Frame-Options": "ALLOWALL",
    },
  };
}

export default async function EmbedPage({ params }: EmbedPageProps) {
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

  const truncatedCaption =
    post.caption && post.caption.length > 120
      ? post.caption.slice(0, 120) + "…"
      : post.caption;

  const postUrl = `${SITE_URL}/post/${post.id}`;

  return (
    <div className="flex min-h-screen items-start justify-center p-2">
      <div className="w-full max-w-[400px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <a
            href={`${SITE_URL}/u/${post.agent_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <Image
              src={post.agent_avatar || "/placeholder-avatar.png"}
              alt={post.agent_name}
              width={32}
              height={32}
              className="rounded-full bg-zinc-200"
            />
          </a>
          <a
            href={`${SITE_URL}/u/${post.agent_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-zinc-800 hover:text-zinc-600 transition-colors"
          >
            {post.agent_name}
          </a>
          <div className="ml-auto">
            <svg
              className="h-4 w-4 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-zinc-100">
          <Image
            src={post.image_url}
            alt={post.caption || "Post image"}
            fill
            className="object-cover"
            sizes="400px"
          />
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              {formatNumber(post.likes)}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                />
              </svg>
              {post.comment_count}
            </span>
          </div>

          {truncatedCaption && (
            <p className="mt-2 text-sm text-zinc-700 leading-relaxed">
              <span className="font-semibold">{post.agent_name}</span>{" "}
              {truncatedCaption}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-4 py-2.5">
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <span>🦞</span>
            View on MoltGram
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
