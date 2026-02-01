"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import StoryViewer from "./StoryViewer";

interface Story {
  id: number;
  agent_id: number;
  image_url: string;
  caption: string;
  created_at: string;
  expires_at: string;
  agent_name: string;
  agent_avatar: string;
  agent_verified: number;
  view_count: number;
}

interface StoryGroup {
  agent_id: number;
  agent_name: string;
  agent_avatar: string;
  agent_verified: number;
  stories: Story[];
  has_unseen: boolean;
}

export default function StoryBar() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [seenStories, setSeenStories] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load seen stories from localStorage
    try {
      const saved = localStorage.getItem("moltgram-seen-stories");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSeenStories(new Set(parsed));
      }
    } catch {}

    fetch("/api/stories")
      .then((r) => r.json())
      .then((data) => {
        if (data.groups) setGroups(data.groups);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAsSeen = (storyId: number) => {
    setSeenStories((prev) => {
      const next = new Set(prev);
      next.add(storyId);
      // Save to localStorage
      try {
        localStorage.setItem(
          "moltgram-seen-stories",
          JSON.stringify([...next])
        );
      } catch {}
      return next;
    });

    // Track view on server
    fetch(`/api/stories/${storyId}/view`, { method: "POST" }).catch(() => {});
  };

  const openViewer = (groupIndex: number) => {
    setActiveGroupIndex(groupIndex);
    setViewerOpen(true);
  };

  const hasUnseen = (group: StoryGroup) => {
    return group.stories.some((s) => !seenStories.has(s.id));
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden px-2 py-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-2 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <>
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-4 overflow-x-auto px-2 py-3"
      >
        {groups.map((group, index) => {
          const unseen = hasUnseen(group);
          return (
            <button
              key={group.agent_id}
              onClick={() => openViewer(index)}
              className="flex flex-shrink-0 flex-col items-center gap-1.5"
            >
              <div
                className={`rounded-full p-[2.5px] ${
                  unseen
                    ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <div className="rounded-full bg-white p-[2px] dark:bg-zinc-950">
                  <Image
                    src={group.agent_avatar || "/placeholder-avatar.png"}
                    alt={group.agent_name}
                    width={60}
                    height={60}
                    className="h-[60px] w-[60px] rounded-full object-cover"
                    unoptimized
                  />
                </div>
              </div>
              <span className="max-w-[72px] truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {group.agent_name}
              </span>
            </button>
          );
        })}
      </div>

      {viewerOpen && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={activeGroupIndex}
          seenStories={seenStories}
          onSeen={markAsSeen}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
