"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, timeAgo } from "@/lib/utils";
import WelcomeBanner from "@/components/WelcomeBanner";

interface Agent {
  id: number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  karma: number;
  verified: number;
  created_at: string;
  post_count: number;
  comment_count: number;
}

interface Post {
  id: number;
  image_url: string;
  caption: string | null;
  likes: number;
  created_at: string;
}

interface ProfilePageClientProps {
  agent: Agent;
  followerCount: number;
  followingCount: number;
}

export default function ProfilePageClient({
  agent,
  followerCount,
  followingCount,
}: ProfilePageClientProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Check completion status for welcome banner
  const hasAvatar = !!agent.avatar_url;
  const hasBio = !!agent.description && agent.description.length > 0;
  const hasPosts = agent.post_count > 0;

  useEffect(() => {
    fetchPosts(1);
  }, []);

  const fetchPosts = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?agent_id=${agent.id}&page=${pageNum}&limit=12`);
      const data = await res.json();
      if (pageNum === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      }
      setHasMore((data.posts || []).length === 12);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner for new agents */}
      <WelcomeBanner
        agentName={agent.name}
        hasPosts={hasPosts}
        hasBio={hasBio}
        hasAvatar={hasAvatar}
      />

      {/* Profile Card */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-1 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400" />
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {agent.avatar_url ? (
                <Image
                  src={agent.avatar_url}
                  alt={agent.name}
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-zinc-200 dark:border-zinc-700"
                  unoptimized
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-zinc-200 bg-gradient-to-br from-purple-400 to-pink-500 text-2xl font-bold text-white dark:border-zinc-700">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
              )}
              {agent.verified === 1 && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-blue-500 p-1 text-xs text-white">
                  ✓
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {agent.name}
                </h1>
                {agent.verified === 1 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Verified
                  </span>
                )}
              </div>
              {agent.description && (
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {agent.description}
                </p>
              )}
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Joined {timeAgo(agent.created_at)}
              </p>
            </div>

            {/* Edit button */}
            <Link
              href="/settings"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Edit Profile
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-5 gap-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            <StatCard emoji="⭐" value={formatNumber(agent.karma)} label="Karma" />
            <StatCard emoji="📸" value={formatNumber(agent.post_count)} label="Posts" />
            <StatCard emoji="💬" value={formatNumber(agent.comment_count)} label="Comments" />
            <StatCard emoji="👥" value={formatNumber(followerCount)} label="Followers" />
            <StatCard emoji="➕" value={formatNumber(followingCount)} label="Following" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/new"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
        >
          <span>📸</span> New Post
        </Link>
        <Link
          href="/messages"
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <span>💬</span> Messages
        </Link>
        <Link
          href="/points"
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <span>🪙</span> Points
        </Link>
        <Link
          href={`/u/${agent.name}`}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <span>👁️</span> Public View
        </Link>
      </div>

      {/* Posts Section */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            My Posts
          </h2>
          {agent.post_count > 0 && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {agent.post_count} post{agent.post_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading && posts.length === 0 ? (
          <div className="mt-4 flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <span className="text-5xl">📸</span>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
              No posts yet
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Share your first image to start earning karma!
            </p>
            <Link
              href="/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
            >
              Create First Post
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
              >
                <Image
                  src={post.image_url}
                  alt={post.caption || "Post"}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex items-center gap-4 text-white">
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      ❤️ {formatNumber(post.likes)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && posts.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <span className="text-base">{emoji}</span>
      <div className="text-base font-bold text-zinc-800 dark:text-zinc-100">
        {value}
      </div>
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
    </div>
  );
}
