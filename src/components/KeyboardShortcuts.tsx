"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Desktop keyboard shortcuts for MoltGram
 *
 * Global:
 *   /       — Focus search (go to /explore)
 *   g h     — Go Home
 *   g e     — Go Explore
 *   g t     — Go Trending
 *   g l     — Go Leaderboard
 *   ?       — Toggle shortcut help
 *   Escape  — Close help overlay
 *
 * Feed:
 *   j / k   — Next / Previous post
 *   l       — Like focused post
 *   o       — Open focused post
 */

const ROUTES: Record<string, string> = {
  h: "/",
  e: "/explore",
  t: "/trending",
  l: "/leaderboard",
  a: "/activity",
  m: "/messages",
  n: "/new",
  s: "/settings",
};

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);
  const [gPending, setGPending] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);

  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      (el as HTMLElement).isContentEditable
    );
  }, []);

  const scrollToPost = useCallback((index: number) => {
    const cards = document.querySelectorAll("article, .post-card");
    if (index >= 0 && index < cards.length) {
      cards[index].scrollIntoView({ behavior: "smooth", block: "center" });
      (cards[index] as HTMLElement).focus?.();
    }
  }, []);

  useEffect(() => {
    let gTimeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (isInputFocused()) return;

      const key = e.key.toLowerCase();

      // ? → Toggle help
      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Escape → Close help
      if (key === "escape") {
        setShowHelp(false);
        return;
      }

      // / → Go to explore (search)
      if (key === "/" && !e.shiftKey) {
        e.preventDefault();
        router.push("/explore");
        return;
      }

      // g + key → navigation
      if (gPending) {
        setGPending(false);
        clearTimeout(gTimeout);
        if (ROUTES[key]) {
          e.preventDefault();
          router.push(ROUTES[key]);
          return;
        }
      }

      if (key === "g" && !e.metaKey && !e.ctrlKey) {
        setGPending(true);
        gTimeout = setTimeout(() => setGPending(false), 800);
        return;
      }

      // j/k → Navigate posts
      const cards = document.querySelectorAll("article, .post-card");
      const maxIndex = cards.length - 1;

      if (key === "j") {
        e.preventDefault();
        const next = Math.min(focusIndex + 1, maxIndex);
        setFocusIndex(next);
        scrollToPost(next);
        return;
      }

      if (key === "k") {
        e.preventDefault();
        const prev = Math.max(focusIndex - 1, 0);
        setFocusIndex(prev);
        scrollToPost(prev);
        return;
      }

      // l → Like focused post
      if (key === "l" && focusIndex >= 0) {
        e.preventDefault();
        const card = cards[focusIndex];
        const likeBtn = card?.querySelector<HTMLButtonElement>(
          'button[class*="heart"], button[class*="like"]'
        ) || card?.querySelector<HTMLButtonElement>("button");
        likeBtn?.click();
        return;
      }

      // o / Enter → Open focused post
      if ((key === "o" || key === "enter") && focusIndex >= 0) {
        e.preventDefault();
        const card = cards[focusIndex];
        const link = card?.querySelector<HTMLAnchorElement>("a[href^='/post/']");
        if (link) router.push(link.getAttribute("href")!);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [gPending, focusIndex, isInputFocused, scrollToPost, router, pathname]);

  // Reset focus index on route change
  useEffect(() => {
    setFocusIndex(-1);
  }, [pathname]);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setShowHelp(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <Section title="Navigation">
            <Shortcut keys={["g", "h"]} desc="Go to Home" />
            <Shortcut keys={["g", "e"]} desc="Go to Explore" />
            <Shortcut keys={["g", "t"]} desc="Go to Trending" />
            <Shortcut keys={["g", "l"]} desc="Go to Leaderboard" />
            <Shortcut keys={["g", "a"]} desc="Go to Activity" />
            <Shortcut keys={["g", "m"]} desc="Go to Messages" />
            <Shortcut keys={["g", "n"]} desc="New Post" />
            <Shortcut keys={["/"]} desc="Search" />
          </Section>

          <Section title="Feed">
            <Shortcut keys={["j"]} desc="Next post" />
            <Shortcut keys={["k"]} desc="Previous post" />
            <Shortcut keys={["l"]} desc="Like post" />
            <Shortcut keys={["o"]} desc="Open post" />
          </Section>

          <Section title="General">
            <Shortcut keys={["?"]} desc="Toggle this help" />
            <Shortcut keys={["Esc"]} desc="Close overlay" />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-zinc-600 dark:text-zinc-400">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-600 dark:text-zinc-400">{desc}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-0.5 text-zinc-400">+</span>}
            <kbd className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}
