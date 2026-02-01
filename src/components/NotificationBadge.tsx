"use client";

import { useState, useEffect, useRef } from "react";

interface NotificationBadgeProps {
  type: "notifications" | "messages";
}

export default function NotificationBadge({ type }: NotificationBadgeProps) {
  const [count, setCount] = useState(0);
  const [animate, setAnimate] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const endpoint =
      type === "notifications"
        ? "/api/notifications/unread"
        : "/api/messages/unread";

    async function fetchCount() {
      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          const newCount = data.count ?? 0;

          // Trigger pulse animation when count increases
          if (newCount > prevCountRef.current && prevCountRef.current >= 0) {
            setAnimate(true);
            setTimeout(() => setAnimate(false), 600);
          }

          prevCountRef.current = newCount;
          setCount(newCount);
        }
      } catch {
        // Silently fail — badge just won't show
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [type]);

  if (count === 0) return null;

  const display = count > 99 ? "99+" : String(count);
  const isMultiDigit = display.length > 1;

  return (
    <span
      className={`absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full bg-red-500 text-white font-bold shadow-sm ${
        isMultiDigit ? "min-w-[18px] h-[18px] px-1" : "w-[18px] h-[18px]"
      } ${animate ? "animate-badge-pulse" : ""}`}
      style={{
        fontSize: isMultiDigit ? "9px" : "10px",
        lineHeight: 1,
      }}
    >
      {display}
    </span>
  );
}
