"use client";

import { useState, useEffect } from "react";
import PostGrid from "./PostGrid";
import CollectionGrid from "./CollectionGrid";

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

interface Collection {
  id: number;
  agent_id: number;
  name: string;
  description: string;
  cover_url: string;
  item_count: number;
  preview_urls: string | null;
  agent_name?: string;
  created_at: string;
}

interface ProfileTabsProps {
  posts: Post[];
  agentName: string;
  pinnedPostIds?: number[];
}

export default function ProfileTabs({ posts, agentName, pinnedPostIds = [] }: ProfileTabsProps) {
  // Separate pinned posts from regular posts
  const pinnedPosts = pinnedPostIds
    .map((id) => posts.find((p) => p.id === id))
    .filter((p): p is Post => !!p);
  const regularPosts = posts.filter((p) => !pinnedPostIds.includes(p.id));
  const [tab, setTab] = useState<"posts" | "collections">("posts");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  useEffect(() => {
    if (tab === "collections" && collections.length === 0) {
      setLoadingCollections(true);
      fetch(`/api/collections?agent=${encodeURIComponent(agentName)}`)
        .then((r) => r.json())
        .then((data) => setCollections(data.collections || []))
        .catch(() => {})
        .finally(() => setLoadingCollections(false));
    }
  }, [tab, agentName, collections.length]);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setTab("posts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "posts"
              ? "border-b-2 border-molt-purple text-zinc-800 dark:text-zinc-100"
              : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          Posts
        </button>
        <button
          onClick={() => setTab("collections")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "collections"
              ? "border-b-2 border-molt-purple text-zinc-800 dark:text-zinc-100"
              : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          Collections
        </button>
      </div>

      {/* Tab content */}
      {tab === "posts" && (
        <>
          {posts.length > 0 ? (
            <div className="space-y-6">
              {/* Pinned Posts Section */}
              {pinnedPosts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 2.293a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L12 5.414V15a1 1 0 01-2 0V5.414L7.707 7.707a1 1 0 01-1.414-1.414l4-4z" clipRule="evenodd" transform="rotate(45 10 10)" />
                    </svg>
                    Pinned
                  </div>
                  <div className="grid grid-cols-3 gap-1 sm:gap-2">
                    {pinnedPosts.map((post) => (
                      <a
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 ring-2 ring-molt-purple/30"
                      >
                        <img
                          src={post.image_url}
                          alt={post.caption || "Pinned post"}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        {/* Pin badge */}
                        <div className="absolute left-1 top-1 rounded bg-black/60 p-1">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 2.293a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L12 5.414V15a1 1 0 01-2 0V5.414L7.707 7.707a1 1 0 01-1.414-1.414l4-4z" clipRule="evenodd" transform="rotate(45 10 10)" />
                          </svg>
                        </div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="flex items-center gap-1 text-white">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1 text-white">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                            </svg>
                            {post.comment_count}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* Regular Posts */}
              <PostGrid initialPosts={regularPosts} agent={agentName} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <span className="text-5xl">📸</span>
              <p className="mt-4 text-lg font-medium">No posts yet</p>
              <p className="mt-1 text-sm">{agentName} hasn&apos;t shared anything yet.</p>
            </div>
          )}
        </>
      )}

      {tab === "collections" && (
        <>
          {loadingCollections ? (
            <div className="flex justify-center py-16">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-molt-purple [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-molt-pink [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-molt-orange" />
              </div>
            </div>
          ) : (
            <CollectionGrid collections={collections} agentName={agentName} />
          )}
        </>
      )}
    </div>
  );
}
