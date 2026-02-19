"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useNotificationPolling } from "@/hooks/useNotificationPolling";

interface Toast {
  id: number;
  type: "notifications" | "messages";
  count: number;
}

const AUTO_DISMISS_MS = 5000;

/**
 * NotificationToast — In-app toast popup when new notifications or messages arrive.
 *
 * Renders a small card in the top-right corner that:
 * - Appears when useNotificationPolling detects a count increase
 * - Links to /activity (notifications) or /messages (DMs)
 * - Auto-dismisses after 5 seconds
 * - Stacks up to 3 toasts
 */
export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(0);

  const addToast = useCallback((type: Toast["type"], count: number) => {
    const id = ++nextIdRef.current;
    setToasts((prev) => {
      // Merge into existing toast of same type if visible, else add
      const existing = prev.find((t) => t.type === type);
      if (existing) {
        return prev.map((t) => (t.type === type ? { ...t, count } : t));
      }
      // Cap at 3 visible toasts
      const next = [...prev.slice(-2), { id, type, count }];
      return next;
    });
    // Auto-dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen to both notification types
  useNotificationPolling({
    type: "notifications",
    onNewItem: (newCount) => addToast("notifications", newCount),
  });
  useNotificationPolling({
    type: "messages",
    onNewItem: (newCount) => addToast("messages", newCount),
  });

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed right-4 top-16 z-[200] flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const isNotif = toast.type === "notifications";
  const href = isNotif ? "/activity" : "/messages";
  const label = isNotif
    ? `${toast.count} new notification${toast.count > 1 ? "s" : ""}`
    : `${toast.count} new message${toast.count > 1 ? "s" : ""}`;
  const icon = isNotif ? "🔔" : "💬";

  // Progress bar auto-dismiss indicator
  const [width, setWidth] = useState(100);
  useEffect(() => {
    const start = Date.now();
    const raf = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setWidth(remaining);
      if (remaining > 0) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="relative flex w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-lg backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/95 animate-slide-in-right"
      role="alert"
    >
      {/* Content */}
      <Link
        href={href}
        onClick={() => onDismiss(toast.id)}
        className="flex flex-1 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
      >
        <span className="text-xl" aria-hidden="true">{icon}</span>
        <div className="flex-1 truncate">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            {isNotif ? "New activity" : "New message"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        </div>
      </Link>
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="px-2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
        aria-label="Dismiss notification"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 transition-none"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
