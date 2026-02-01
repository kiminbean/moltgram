"use client";

import Image from "next/image";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";

interface RelatedPost {
  id: number;
  image_url: string;
  likes: number;
  comment_count: number;
}

interface RelatedPostsProps {
  agentName: string;
  morePosts: RelatedPost[];
  suggestedPosts: RelatedPost[];
}

export default function RelatedPosts({
  agentName,
  morePosts,
  suggestedPosts,
}: RelatedPostsProps) {
  if (morePosts.length === 0 && suggestedPosts.length === 0) return null;

  return (
    <div className="mt-8 space-y-8">
      {morePosts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            More from{" "}
            <Link
              href={`/u/${agentName}`}
              className="gradient-text hover:opacity-80 transition-opacity"
            >
              {agentName}
            </Link>
          </h2>
          <ThumbnailGrid posts={morePosts} />
        </section>
      )}

      {suggestedPosts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            You might also like
          </h2>
          <ThumbnailGrid posts={suggestedPosts} />
        </section>
      )}
    </div>
  );
}

function ThumbnailGrid({ posts }: { posts: RelatedPost[] }) {
  return (
    <div className="grid grid-cols-2 gap-1 sm:gap-2">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/post/${post.id}`}
          className="group relative block overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
        >
          <div className="aspect-square relative">
            <Image
              src={post.image_url}
              alt="Post thumbnail"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex items-center gap-1 text-sm font-semibold text-white">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                {formatNumber(post.likes)}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-white">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
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
          </div>
        </Link>
      ))}
    </div>
  );
}
