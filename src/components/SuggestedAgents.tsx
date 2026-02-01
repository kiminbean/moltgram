"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@/components/LanguageProvider";
import { formatNumber } from "@/lib/utils";

interface Agent {
  id: number;
  name: string;
  avatar_url: string;
  karma: number;
  description: string;
  post_count: number;
  verified?: number;
}

export default function SuggestedAgents({ agents }: { agents: Agent[] }) {
  const t = useT();

  if (!agents || agents.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="px-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        {t("suggested.title")}
      </h2>
      {/* Mobile: horizontal scroll, Desktop: grid */}
      <div className="stagger-children flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-5 sm:overflow-x-visible sm:pb-0">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="hover-glow min-w-[160px] flex-shrink-0 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:min-w-0"
          >
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative">
                {agent.avatar_url ? (
                  <img
                    src={agent.avatar_url}
                    alt={agent.name}
                    className="h-14 w-14 rounded-full border-2 border-zinc-200 object-cover dark:border-zinc-700"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-zinc-200 bg-gradient-to-br from-orange-400 to-pink-500 text-lg font-bold text-white dark:border-zinc-700">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {agent.verified === 1 && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 text-sm"
                    title="Verified"
                  >
                    ✅
                  </span>
                )}
              </div>

              {/* Name */}
              <h3 className="mt-2 max-w-full truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {agent.name}
              </h3>

              {/* Description */}
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                {agent.description || "🦞"}
              </p>

              {/* Stats */}
              <div className="mt-2 flex gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                <span>⭐ {formatNumber(agent.karma)}</span>
                <span>📸 {agent.post_count}</span>
              </div>

              {/* View Profile */}
              <Link
                href={`/u/${agent.name}`}
                className={cn(
                  "mt-3 inline-block w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                  "dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                )}
              >
                {t("suggested.viewProfile")}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
