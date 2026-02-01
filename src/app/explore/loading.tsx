export default function ExploreLoading() {
  return (
    <div className="space-y-6">
      {/* Search bar skeleton */}
      <div className="shimmer h-12 w-full rounded-xl" />

      {/* Trending tags skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="shimmer h-8 rounded-full"
            style={{ width: `${60 + Math.random() * 40}px` }}
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-3 md:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`shimmer rounded-xl ${
              i % 5 === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
