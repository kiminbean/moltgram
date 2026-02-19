"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useNotificationPolling — Smart polling hook for unread notification/message counts.
 *
 * Improvements over naive setInterval approach:
 * - Visibility-aware: polls every ACTIVE_MS when tab is visible, HIDDEN_MS when hidden.
 *   On tab focus, immediately re-fetches to surface any new items.
 * - Exponential back-off: on consecutive errors, doubles the interval up to MAX_BACKOFF_MS
 *   so we don't hammer a degraded API.
 * - Returns both the current count and an `onNewItem` callback consumers can use to show
 *   in-app toast notifications.
 */

const ACTIVE_MS = 15_000;    // 15 s when tab is in focus
const HIDDEN_MS = 60_000;    // 60 s when tab is backgrounded
const MAX_BACKOFF_MS = 120_000; // 2 min ceiling on error back-off

interface UseNotificationPollingOptions {
  type: "notifications" | "messages";
  /** Called whenever the count increases (new item arrived). */
  onNewItem?: (newCount: number, prevCount: number) => void;
}

export function useNotificationPolling({
  type,
  onNewItem,
}: UseNotificationPollingOptions) {
  const [count, setCount] = useState(0);
  const prevCountRef = useRef(-1);   // -1 = initial (skip first-load onNewItem)
  const errorStreakRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNewItemRef = useRef(onNewItem);
  onNewItemRef.current = onNewItem;

  const endpoint =
    type === "notifications"
      ? "/api/notifications/unread"
      : "/api/messages/unread";

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newCount: number = data.count ?? 0;

      if (prevCountRef.current >= 0 && newCount > prevCountRef.current) {
        onNewItemRef.current?.(newCount, prevCountRef.current);
      }

      prevCountRef.current = newCount;
      setCount(newCount);
      errorStreakRef.current = 0;
    } catch {
      errorStreakRef.current += 1;
      // Silently fail — badge stays at last known count
    }
  }, [endpoint]);

  // Schedule next poll, respecting visibility + backoff
  const schedule = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    const hidden = typeof document !== "undefined" && document.hidden;
    const backoff = Math.min(
      Math.pow(2, errorStreakRef.current) * 1000,
      MAX_BACKOFF_MS
    );
    const base = hidden ? HIDDEN_MS : ACTIVE_MS;
    const delay = errorStreakRef.current > 0 ? Math.max(base, backoff) : base;

    timerRef.current = setTimeout(async () => {
      await fetchCount();
      schedule(); // reschedule after each fetch
    }, delay);
  }, [fetchCount]);

  useEffect(() => {
    // Initial fetch
    fetchCount().then(schedule);

    // Re-fetch immediately when tab becomes visible
    const handleVisibility = () => {
      if (!document.hidden) {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        fetchCount().then(schedule);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [fetchCount, schedule]);

  return count;
}
