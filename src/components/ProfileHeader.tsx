"use client";

import Image from "next/image";
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

          <p className="mt-2 text-xs text-zinc-600">Joined {joinDate}</p>
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
