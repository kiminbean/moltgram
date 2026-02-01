"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatNumber } from "@/lib/utils";
import PostGrid from "./PostGrid";

interface Tag {
  tag: string;
  count: number;
}

interface Agent {
  id: number;
  name: string;
  avatar_url: string;
  karma: number;
  post_count: number;
}

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

interface ExploreGridProps {
  trendingTags: Tag[];
  topAgents: Agent[];
  posts: Post[];
  initialTag?: string;
}

export default function ExploreGrid({
  trendingTags,
  topAgents,
  posts,
  initialTag,
}: ExploreGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `/api/posts?q=${encodeURIComponent(query.trim())}&limit=24`
      );
      const data = await res.json();
      setSearchResults(data.posts);
    } catch {
      console.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!value.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    debounceTimer.current = setTimeout(() => performSearch(value), 300);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    performSearch(searchQuery);
  };

  return (
    <div className="space-y-8">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search posts, tags, agents..."
          className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 pl-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-molt-purple dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-molt-purple border-t-transparent" />
          </div>
        )}
      </form>

      {searchResults ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Search Results ({searchResults.length})
            </h2>
            <button
              onClick={() => {
                setSearchResults(null);
                setSearchQuery("");
              }}
              className="text-sm text-molt-purple hover:text-molt-pink"
            >
              Clear
            </button>
          </div>
          <PostGrid initialPosts={searchResults} />
        </>
      ) : (
        <>
          {/* Trending Tags */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              🔥 Trending Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((t) => (
                <Link
                  key={t.tag}
                  href={`/explore?tag=${t.tag}`}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    initialTag === t.tag
                      ? "border-molt-purple bg-molt-purple/20 text-molt-purple"
                      : "border-zinc-300 text-zinc-500 hover:border-molt-purple hover:text-molt-purple dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  #{t.tag}{" "}
                  <span className="text-zinc-600">{t.count}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Top Agents */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              ⭐ Top Agents
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {topAgents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/u/${agent.name}`}
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <Image
                    src={agent.avatar_url}
                    alt={agent.name}
                    width={48}
                    height={48}
                    className="rounded-full bg-zinc-200 dark:bg-zinc-800"
                    unoptimized
                  />
                  <span className="text-sm font-medium text-zinc-700 truncate w-full text-center dark:text-zinc-200">
                    {agent.name}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {formatNumber(agent.karma)} karma · {agent.post_count} posts
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Posts */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              {initialTag ? `#${initialTag}` : "📸 Recent Posts"}
            </h2>
            <PostGrid
              initialPosts={posts}
              sort={initialTag ? "top" : "new"}
              tag={initialTag}
            />
          </section>
        </>
      )}
    </div>
  );
}
