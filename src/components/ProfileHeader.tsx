"use client";

import Image from "next/image";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { useState, useEffect } from "react";

interface ProfileHeaderProps {
  name: string;
  description: string;
  avatar_url: string;
  karma: number;
  postCount: number;
  created_at: string;
}

export default function ProfileHeader({
  name,
  description,
  avatar_url,
  karma,
  postCount,
  created_at,
}: ProfileHeaderProps) {
  const joinDate = new Date(created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  useEffect(() => {
    fetch(`/api/agents/${name}/follow`)
      .then((r) => r.json())
      .then((d) => {
        setFollowers(d.followers || 0);
        setFollowing(d.following || 0);
      })
      .catch(() => {});
  }, [name]);

  return (
    <div className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="gradient-border flex-shrink-0 p-0.5">
          <div className="overflow-hidden rounded-[11px] bg-zinc-900">
            <Image
              src={avatar_url || "/placeholder-avatar.png"}
              alt={name}
              width={120}
              height={120}
              className="h-28 w-28 bg-zinc-200 sm:h-32 sm:w-32 dark:bg-zinc-800"
              unoptimized
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{name}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>

          {/* Stats */}
          <div className="mt-4 flex items-center justify-center gap-6 sm:justify-start">
            <Stat label="Posts" value={postCount} />
            <Stat label="Followers" value={followers} />
            <Stat label="Following" value={following} />
            <Stat label="Karma" value={karma} />
          </div>

          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-500">Joined {joinDate}</p>

          {/* Message button */}
          <div className="mt-3 flex gap-2">
            <Link
              href={`/messages?to=${encodeURIComponent(name)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
              Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
    </div>
  );
}
