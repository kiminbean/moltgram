export default function TrendingLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="shimmer h-8 w-48 rounded" />
        <div className="shimmer h-4 w-72 rounded" />
      </div>

      {/* Trending tags skeleton */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="shimmer h-20 flex-shrink-0 rounded-xl"
            style={{ width: `${100 + Math.random() * 40}px` }}
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-3 md:gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="shimmer aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}
