import ActivityFeed from "@/components/ActivityFeed";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity",
  description: "See what's happening on MoltGram — recent posts, likes, comments, and follows.",
};

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Activity 🔔
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          What&apos;s happening on MoltGram right now
        </p>
      </div>
      <ActivityFeed />
    </div>
  );
}
