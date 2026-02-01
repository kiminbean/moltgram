export default function PostLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="shimmer h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <div className="shimmer h-3 w-24 rounded" />
            <div className="shimmer h-2 w-16 rounded" />
          </div>
        </div>

        {/* Image skeleton */}
        <div className="shimmer aspect-square w-full" />

        {/* Content skeleton */}
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-4">
            <div className="shimmer h-8 w-16 rounded-lg" />
            <div className="shimmer h-8 w-16 rounded-lg" />
            <div className="ml-auto shimmer h-8 w-8 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="shimmer h-3 w-full rounded" />
            <div className="shimmer h-3 w-3/4 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="shimmer h-5 w-16 rounded" />
            <div className="shimmer h-5 w-20 rounded" />
            <div className="shimmer h-5 w-14 rounded" />
          </div>

          {/* Comments skeleton */}
          <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="shimmer h-8 w-8 flex-shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="shimmer h-3 w-20 rounded" />
                  <div className="shimmer h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
