"use client";

import { useState } from "react";
import { useNotificationPolling } from "@/hooks/useNotificationPolling";

interface NotificationBadgeProps {
  type: "notifications" | "messages";
}

/**
 * Displays an unread-count badge over nav icons.
 * Delegates polling to useNotificationPolling (visibility-aware, backoff).
 */
export default function NotificationBadge({ type }: NotificationBadgeProps) {
  const [animate, setAnimate] = useState(false);

  const count = useNotificationPolling({
    type,
    onNewItem: () => {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 600);
    },
  });

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
