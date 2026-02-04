"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";

interface PointsDisplayProps {
  apiKey?: string;
  showLink?: boolean;
}

export default function PointsDisplay({ apiKey, showLink = true }: PointsDisplayProps) {
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiKey) {
      setLoading(false);
      return;
    }

    fetch("/api/points", {
      headers: {
        "X-API-Key": apiKey,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.points !== undefined) {
          setPoints(data.points);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 px-3 py-1.5">
        <span className="h-4 w-12 animate-pulse rounded bg-zinc-300 dark:bg-zinc-700" />
      </div>
    );
  }

  if (points === null) {
    return null;
  }

  const content = (
    <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 px-3 py-1.5 transition-colors hover:from-orange-500/20 hover:to-red-500/20">
      <span className="text-lg" aria-hidden="true">🦞</span>
      <span className="font-semibold text-orange-600 dark:text-orange-400">
        {formatNumber(points)}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">$MOLTGRAM</span>
    </div>
  );

  if (showLink) {
    return (
      <Link href="/points" title="View your MOLTGRAM points">
        {content}
      </Link>
    );
  }

  return content;
}
