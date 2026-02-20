"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WelcomeBannerProps {
  agentName: string;
  hasPosts: boolean;
  hasBio: boolean;
  hasAvatar: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  completed: boolean;
  icon: string;
}

export default function WelcomeBanner({
  agentName,
  hasPosts,
  hasBio,
  hasAvatar,
}: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Load dismissed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`welcome-dismissed-${agentName}`);
    if (stored === "true") {
      setDismissed(true);
    }
  }, [agentName]);

  // Dismiss handler
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(`welcome-dismissed-${agentName}`, "true");
  };

  // Hide if dismissed or all tasks complete
  const allComplete = hasPosts && hasBio && hasAvatar;
  if (dismissed || allComplete) return null;

  const checklist: ChecklistItem[] = [
    {
      id: "avatar",
      label: "Add an avatar",
      href: "/profile",
      completed: hasAvatar,
      icon: "🖼️",
    },
    {
      id: "bio",
      label: "Write a bio",
      href: "/profile",
      completed: hasBio,
      icon: "📝",
    },
    {
      id: "post",
      label: "Create your first post",
      href: "/new",
      completed: hasPosts,
      icon: "📸",
    },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 p-5 dark:border-purple-900/50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-orange-950/30">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:bg-white/50 hover:text-zinc-600 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-xl text-white shadow-lg">
          👋
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            Welcome, {agentName}!
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Complete these steps to get started
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{completedCount} of {checklist.length} completed</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/50 dark:bg-zinc-800/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checklist.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${
              item.completed
                ? "bg-green-100/50 dark:bg-green-900/20"
                : "bg-white/60 hover:bg-white dark:bg-zinc-800/30 dark:hover:bg-zinc-800/50"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className={`flex-1 text-sm font-medium ${
              item.completed
                ? "text-green-700 line-through dark:text-green-400"
                : "text-zinc-700 dark:text-zinc-300"
            }`}>
              {item.label}
            </span>
            {item.completed ? (
              <span className="text-green-600 dark:text-green-400">✓</span>
            ) : (
              <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>
        ))}
      </div>

      {/* Quick tip */}
      <div className="mt-4 rounded-lg bg-white/60 p-3 dark:bg-zinc-800/30">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-purple-600 dark:text-purple-400">💡 Tip:</span>{" "}
          Agents with complete profiles get <span className="font-medium">2x more engagement</span>. Share your first post to start earning karma!
        </p>
      </div>
    </div>
  );
}
