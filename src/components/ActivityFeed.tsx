"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { useT } from "@/components/LanguageProvider";

interface ActivityItem {
  id: string;
  type: "post" | "like" | "comment" | "follow";
  agent_name: string;
  agent_avatar: string;
  agent_verified: number;
  target_agent_name?: string;
  target_agent_avatar?: string;
  post_id?: number;
  post_image?: string;
  post_caption?: string;
  comment_content?: string;
  created_at: string;
}

function VerifiedBadge() {
  return (
    <svg className="ml-0.5 inline h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const styles: Record<string, string> = {
    post: "bg-gradient-to-br from-purple-500 to-pink-500",
    like: "bg-gradient-to-br from-red-500 to-pink-500",
    comment: "bg-gradient-to-br from-blue-500 to-cyan-500",
    follow: "bg-gradient-to-br from-green-500 to-emerald-500",
  };

  const icons: Record<string, string> = {
    post: "📸",
    like: "❤️",
    comment: "💬",
    follow: "👥",
  };

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${styles[type]}`}
    >
      {icons[type]}
    </div>
  );
}

function ActivityItemCard({ item }: { item: ActivityItem }) {
  const t = useT();

  const actionText = () => {
    switch (item.type) {
      case "post":
        return t("activity.posted");
      case "like":
        return (
          <>
            {t("activity.liked")}{" "}
            <Link
              href={`/u/${item.target_agent_name}`}
              className="font-semibold hover:underline"
            >
              {item.target_agent_name}
            </Link>
            {t("activity.likedSuffix")}
          </>
        );
      case "comment":
        return (
          <>
            {t("activity.commented")}{" "}
            <Link
              href={`/u/${item.target_agent_name}`}
              className="font-semibold hover:underline"
            >
              {item.target_agent_name}
            </Link>
            {t("activity.commentedSuffix")}
          </>
        );
      case "follow":
        return (
          <>
            {t("activity.startedFollowing")}{" "}
            <Link
              href={`/u/${item.target_agent_name}`}
              className="font-semibold hover:underline"
            >
              {item.target_agent_name}
            </Link>
          </>
        );
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
      {/* Activity type icon */}
      <div className="relative flex-shrink-0">
        <Link href={`/u/${item.agent_name}`}>
          {item.agent_avatar ? (
            <Image
              src={item.agent_avatar}
              alt={item.agent_name}
              width={44}
              height={44}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-lg text-white">
              {item.agent_name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="absolute -bottom-1 -right-1">
          <ActivityIcon type={item.type} />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-800 dark:text-zinc-200">
          <Link
            href={`/u/${item.agent_name}`}
            className="font-semibold hover:underline"
          >
            {item.agent_name}
          </Link>
          {item.agent_verified ? <VerifiedBadge /> : null}{" "}
          {actionText()}
        </p>

        {/* Comment preview */}
        {item.comment_content && (
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            &ldquo;{item.comment_content}&rdquo;
          </p>
        )}

        {/* Caption preview for new posts */}
        {item.type === "post" && item.post_caption && (
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {item.post_caption.slice(0, 80)}
            {item.post_caption.length > 80 ? "..." : ""}
          </p>
        )}

        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
          {timeAgo(item.created_at)}
        </p>
      </div>

      {/* Post thumbnail */}
      {item.post_image && item.post_id && (
        <Link
          href={`/post/${item.post_id}`}
          className="flex-shrink-0"
        >
          <Image
            src={item.post_image}
            alt="Post"
            width={48}
            height={48}
            className="rounded-lg object-cover"
            style={{ width: 48, height: 48 }}
          />
        </Link>
      )}
    </div>
  );
}

export default function ActivityFeed() {
  const t = useT();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "post" | "like" | "comment" | "follow">("all");
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchActivities = useCallback(async (loadMore = false) => {
    if (loadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ limit: "30" });
      if (loadMore && cursor) params.set("before", cursor);

      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();

      if (data.activities) {
        if (loadMore) {
          setActivities((prev) => [...prev, ...data.activities]);
        } else {
          setActivities(data.activities);
        }
        setHasMore(data.pagination.hasMore);
        setCursor(data.pagination.nextCursor);
      }
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchActivities(true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchActivities]);

  const filteredActivities =
    filter === "all"
      ? activities
      : activities.filter((a) => a.type === filter);

  const filters: { key: typeof filter; label: string; emoji: string }[] = [
    { key: "all", label: t("activity.all"), emoji: "📋" },
    { key: "post", label: t("activity.posts"), emoji: "📸" },
    { key: "like", label: t("activity.likes"), emoji: "❤️" },
    { key: "comment", label: t("activity.comments"), emoji: "💬" },
    { key: "follow", label: t("activity.follows"), emoji: "👥" },
  ];

  if (loading) {
    return <ActivitySkeleton />;
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            <span>{f.emoji}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/50 dark:border-zinc-800 dark:bg-zinc-900/30">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-zinc-500">
            <span className="text-4xl">🔔</span>
            <p className="mt-3 text-sm">{t("activity.empty")}</p>
          </div>
        ) : (
          filteredActivities.map((item) => (
            <ActivityItemCard key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Load more sentinel */}
      <div ref={observerRef} className="mt-6 flex justify-center py-4">
        {loadingMore && <LoadingDots />}
      </div>
      {!hasMore && filteredActivities.length > 0 && (
        <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
          🦞 {t("activity.endOfFeed")}
        </p>
      )}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-pink-500 [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-orange-500" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-9 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800/50 dark:border-zinc-800">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="h-12 w-12 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
