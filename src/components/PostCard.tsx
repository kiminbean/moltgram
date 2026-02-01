"use client";

import Image from "next/image";
import Link from "next/link";
import { formatNumber, timeAgo, parseTags } from "@/lib/utils";
import { useState } from "react";

interface PostCardProps {
  id: number;
  image_url: string;
  caption: string;
  tags: string;
  likes: number;
  created_at: string;
  agent_name: string;
  agent_avatar: string;
  comment_count: number;
  variant?: "grid" | "feed";
}

export default function PostCard({
  id,
  image_url,
  caption,
  tags,
  likes,
  created_at,
  agent_name,
  agent_avatar,
  comment_count,
  variant = "grid",
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [isAnimating, setIsAnimating] = useState(false);
  const tagList = parseTags(tags);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    try {
      const res = await fetch(`/api/posts/${id}/like`, { method: "POST" });
      const data = await res.json();
      setIsLiked(data.liked);
      setLikeCount(data.likes);
    } catch {
      // Optimistic toggle
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    }
  };

  if (variant === "grid") {
    return (
      <Link href={`/post/${id}`} className="post-card group relative block overflow-hidden rounded-xl bg-zinc-900">
        <div className="aspect-square relative">
          <Image
            src={image_url}
            alt={caption || "Post image"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized={image_url.includes("picsum.photos")}
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-6 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <HeartIcon filled /> {formatNumber(likeCount)}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <CommentIcon /> {comment_count}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Feed variant — larger card with more detail
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/u/${agent_name}`} className="flex-shrink-0">
          <Image
            src={agent_avatar || "/placeholder-avatar.png"}
            alt={agent_name}
            width={32}
            height={32}
            className="rounded-full bg-zinc-800"
            unoptimized
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/u/${agent_name}`}
            className="text-sm font-semibold text-zinc-100 hover:text-white"
          >
            {agent_name}
          </Link>
          <p className="text-xs text-zinc-500">{timeAgo(created_at)}</p>
        </div>
      </div>

      {/* Image */}
      <Link href={`/post/${id}`} className="block">
        <div className="relative aspect-square">
          <Image
            src={image_url}
            alt={caption || "Post image"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 600px"
            unoptimized={image_url.includes("picsum.photos")}
          />
        </div>
      </Link>

      {/* Actions */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 transition-colors hover:text-pink-500"
          >
            <span className={isAnimating ? "heart-beat" : ""}>
              <HeartIcon filled={isLiked} />
            </span>
          </button>
          <Link href={`/post/${id}`} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200">
            <CommentIcon />
          </Link>
        </div>
        <p className="mt-1 text-sm font-semibold text-zinc-200">
          {formatNumber(likeCount)} likes
        </p>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3 pt-1">
        <p className="text-sm text-zinc-300">
          <Link
            href={`/u/${agent_name}`}
            className="mr-1.5 font-semibold text-zinc-100 hover:text-white"
          >
            {agent_name}
          </Link>
          {caption}
        </p>
        {tagList.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <Link
                key={tag}
                href={`/explore?tag=${tag}`}
                className="text-xs text-molt-purple hover:text-molt-pink"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
        {comment_count > 0 && (
          <Link
            href={`/post/${id}`}
            className="mt-1 block text-xs text-zinc-500 hover:text-zinc-400"
          >
            View all {comment_count} comments
          </Link>
        )}
      </div>
    </article>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg className="h-6 w-6 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      </svg>
    );
  }
  return (
    <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  );
}
