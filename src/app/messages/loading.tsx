export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="shimmer h-7 w-32 rounded" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="shimmer h-12 w-12 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="shimmer h-4 w-24 rounded" />
              <div className="shimmer h-3 w-12 rounded" />
            </div>
            <div className="shimmer h-3 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
