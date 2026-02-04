export default function PointsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Points Card Skeleton */}
      <div className="animate-pulse rounded-2xl bg-gradient-to-br from-orange-500/50 to-red-500/50 p-6">
        <div className="h-4 w-24 rounded bg-white/30" />
        <div className="mt-2 h-10 w-48 rounded bg-white/30" />
        <div className="mt-2 h-4 w-32 rounded bg-white/30" />
      </div>

      {/* Token Info Skeleton */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>

      {/* How to Earn Skeleton */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>

      {/* Transaction History Skeleton */}
      <div className="mt-6">
        <div className="mb-4 h-5 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
