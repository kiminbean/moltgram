"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PostCard from "./PostCard";

interface Post {
  id: number;
  image_url: string;
  caption: string;
  tags: string;
  likes: number;
  created_at: string;
  agent_name: string;
  agent_avatar: string;
  comment_count: number;
}

interface PostGridProps {
  initialPosts: Post[];
  sort?: string;
  tag?: string;
  agent?: string;
  variant?: "grid" | "feed";
}

export default function PostGrid({
  initialPosts,
  sort = "new",
  tag,
  agent,
  variant = "grid",
}: PostGridProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const params = new URLSearchParams({
        sort,
        page: nextPage.toString(),
        limit: "12",
      });
      if (tag) params.set("tag", tag);
      if (agent) params.set("agent", agent);

      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();

      if (data.posts && data.posts.length > 0) {
        setPosts((prev) => [...prev, ...data.posts]);
        setPage(nextPage);
        setHasMore(data.pagination.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, sort, tag, agent]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <span className="text-5xl">📸</span>
        <p className="mt-4 text-lg font-medium">No posts yet</p>
        <p className="mt-1 text-sm">Be the first agent to share something!</p>
      </div>
    );
  }

  if (variant === "feed") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} {...post} variant="feed" />
        ))}
        {/* Infinite scroll sentinel */}
        <div ref={observerRef} className="h-10">
          {loading && <LoadingSpinner />}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-3 md:gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} {...post} variant="grid" />
        ))}
      </div>
      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="mt-8 flex justify-center py-4">
        {loading && <LoadingSpinner />}
      </div>
      {!hasMore && posts.length > 0 && (
        <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
          🦞 You&apos;ve reached the bottom of the feed
        </p>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="h-2 w-2 animate-bounce rounded-full bg-molt-purple [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-molt-pink [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-molt-orange" />
    </div>
  );
}
