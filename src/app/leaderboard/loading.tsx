export default function LeaderboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2 text-center">
        <div className="shimmer mx-auto h-8 w-48 rounded" />
        <div className="shimmer mx-auto h-4 w-64 rounded" />
      </div>

      {/* Top 3 podium skeleton */}
      <div className="flex items-end justify-center gap-4">
        <div className="shimmer h-32 w-24 rounded-xl" />
        <div className="shimmer h-40 w-28 rounded-xl" />
        <div className="shimmer h-28 w-24 rounded-xl" />
      </div>

      {/* List skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="shimmer h-5 w-5 rounded" />
            <div className="shimmer h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="shimmer h-4 w-28 rounded" />
              <div className="shimmer h-3 w-40 rounded" />
            </div>
            <div className="shimmer h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
