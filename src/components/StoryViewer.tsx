"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { timeAgo } from "@/lib/utils";

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

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  seenStories: Set<number>;
  onSeen: (storyId: number) => void;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({
  groups,
  initialGroupIndex,
  seenStories,
  onSeen,
  onClose,
}: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number>(0);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Mark story as seen
  useEffect(() => {
    if (currentStory && !seenStories.has(currentStory.id)) {
      onSeen(currentStory.id);
    }
  }, [currentStory, seenStories, onSeen]);

  const goNext = useCallback(() => {
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      // Next story in same group
      setStoryIndex((s) => s + 1);
      setProgress(0);
      setImageLoaded(false);
    } else if (groupIndex < groups.length - 1) {
      // Next group
      setGroupIndex((g) => g + 1);
      setStoryIndex(0);
      setProgress(0);
      setImageLoaded(false);
    } else {
      // End of all stories
      onClose();
    }
  }, [currentGroup, storyIndex, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((s) => s - 1);
      setProgress(0);
      setImageLoaded(false);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((g) => g - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
      setImageLoaded(false);
    }
  }, [storyIndex, groupIndex, groups]);

  // Progress timer
  useEffect(() => {
    if (!imageLoaded || isPaused) return;

    startTimeRef.current = Date.now() - pausedAtRef.current;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        goNext();
      }
    }, 30);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [imageLoaded, isPaused, goNext, storyIndex, groupIndex]);

  // Reset paused progress when story changes
  useEffect(() => {
    pausedAtRef.current = 0;
  }, [storyIndex, groupIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!currentGroup || !currentStory) {
    onClose();
    return null;
  }

  const handleTouchArea = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX =
      "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const half = rect.width / 2;

    if (x < half) {
      goPrev();
    } else {
      goNext();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-50 rounded-full p-2 text-white/80 transition-colors hover:text-white"
        aria-label="Close"
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Story Container */}
      <div
        className="relative flex h-full w-full max-w-lg flex-col"
        onMouseDown={() => {
          setIsPaused(true);
          pausedAtRef.current = Date.now() - startTimeRef.current;
        }}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => {
          setIsPaused(true);
          pausedAtRef.current = Date.now() - startTimeRef.current;
        }}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute left-0 right-0 top-0 z-40 flex gap-1 px-3 pt-3">
          {currentGroup.stories.map((s, i) => (
            <div
              key={s.id}
              className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full rounded-full bg-white transition-none"
                style={{
                  width:
                    i < storyIndex
                      ? "100%"
                      : i === storyIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Agent header */}
        <div className="absolute left-0 right-0 top-6 z-40 flex items-center gap-3 px-4 py-2">
          <Image
            src={currentGroup.agent_avatar || "/placeholder-avatar.png"}
            alt={currentGroup.agent_name}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-white/20"
            unoptimized
          />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white">
              {currentGroup.agent_name}
            </span>
            {currentGroup.agent_verified ? (
              <svg className="h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
            ) : null}
          </div>
          <span className="text-xs text-white/60">
            {timeAgo(currentStory.created_at)}
          </span>
        </div>

        {/* Story image — tap left/right to navigate */}
        <div
          className="relative flex flex-1 cursor-pointer items-center justify-center"
          onClick={handleTouchArea}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          )}
          <Image
            src={currentStory.image_url}
            alt={currentStory.caption || "Story"}
            fill
            className={`object-contain transition-opacity duration-200 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            sizes="100vw"
            priority
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-6 pt-16">
            <p className="text-center text-sm font-medium text-white drop-shadow-lg">
              {currentStory.caption}
            </p>
            <p className="mt-1 text-center text-xs text-white/50">
              👁 {currentStory.view_count} views
            </p>
          </div>
        )}
      </div>

      {/* Navigation arrows (desktop) */}
      {groupIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-4 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:block"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
      {groupIndex < groups.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-4 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:block"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
