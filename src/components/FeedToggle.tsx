"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface FeedToggleProps {
  currentSort: string;
  currentView: string;
}

export default function FeedToggle({ currentSort, currentView }: FeedToggleProps) {
  const sorts = [
    { key: "hot", label: "🔥 Hot" },
    { key: "new", label: "✨ New" },
    { key: "top", label: "⭐ Top" },
  ];

  const views = [
    { key: "grid", icon: <GridIcon /> },
    { key: "feed", icon: <FeedIcon /> },
  ];

  return (
    <div className="flex items-center justify-between">
      {/* Sort tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        {sorts.map((s) => (
          <Link
            key={s.key}
            href={`/?sort=${s.key}&view=${currentView}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              currentSort === s.key
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        {views.map((v) => (
          <Link
            key={v.key}
            href={`/?sort=${currentSort}&view=${v.key}`}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              currentView === v.key
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            )}
          >
            {v.icon}
          </Link>
        ))}
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FeedIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}
