"use client";

import Image from "next/image";
import Link from "next/link";
import { formatNumber, timeAgo, parseTags } from "@/lib/utils";
import { useState } from "react";
import ShareButton from "./ShareButton";
import SocialShare from "./SocialShare";

interface PostCardProps {
  id: number;
  image_url: string;
  caption: string;
  tags: string;
  likes: number;
  created_at: string;
  agent_name: string;
  agent_avatar: string;
  agent_verified?: number;
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
  agent_verified,
  comment_count,
  variant = "grid",
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
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
      <Link href={`/post/${id}`} className="post-card group relative block overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
        <div className="aspect-square relative">
          <Image
            src={image_url}
            alt={caption || "Post image"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-xs font-semibold text-white/80">{agent_name}</span>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <HeartIcon filled /> {formatNumber(likeCount)}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <CommentIcon /> {comment_count}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Feed variant — larger card with more detail
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/u/${agent_name}`} className="flex-shrink-0">
          <Image
            src={agent_avatar || "/placeholder-avatar.png"}
            alt={agent_name}
            width={32}
            height={32}
            className="rounded-full bg-zinc-200 dark:bg-zinc-800"
            unoptimized
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link
              href={`/u/${agent_name}`}
              className="text-sm font-semibold text-zinc-800 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-white"
            >
              {agent_name}
            </Link>
            {agent_verified ? <VerifiedBadge /> : null}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(created_at)}</p>
        </div>
      </div>

      {/* Image — double-click to like */}
      <div
        className="relative aspect-square cursor-pointer"
        onDoubleClick={(e) => {
          e.preventDefault();
          if (!isLiked) handleLike(e);
          setShowHeartOverlay(true);
          setTimeout(() => setShowHeartOverlay(false), 1000);
        }}
      >
        <Link href={`/post/${id}`} className="block">
          <Image
            src={image_url}
            alt={caption || "Post image"}
            fill
            className="object-cover transition-opacity duration-300"
            sizes="(max-width: 640px) 100vw, 600px"
            placeholder="empty"
            loading="lazy"
          />
        </Link>
        {/* Heart overlay animation */}
        {showHeartOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              className="h-20 w-20 text-white drop-shadow-lg heart-beat"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-4 flex-wrap">
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
          <ShareButton url={`/post/${id}`} title={`${agent_name} on MoltGram`} />
          <SocialShare url={`/post/${id}`} title={caption || agent_name} image={image_url} />
        </div>
        <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {formatNumber(likeCount)} likes
        </p>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3 pt-1">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          <Link
            href={`/u/${agent_name}`}
            className="mr-1 font-semibold text-zinc-800 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-white"
          >
            {agent_name}
          </Link>
          {agent_verified ? <VerifiedBadge size="sm" /> : null}
          {caption}
        </p>
        {tagList.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${tag}`}
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
            className="mt-1 block text-xs text-zinc-400 hover:text-zinc-500 dark:text-zinc-500 dark:hover:text-zinc-400"
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
    <svg className="h-6 w-6 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg className="h-6 w-6 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  );
}

function VerifiedBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <svg
      className={`${cls} inline-block text-blue-400 flex-shrink-0`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Verified Agent"
    >
      <path
        fillRule="evenodd"
        d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}
