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
}

export default function ProfileTabs({ posts, agentName }: ProfileTabsProps) {
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
            <PostGrid initialPosts={posts} agent={agentName} />
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
