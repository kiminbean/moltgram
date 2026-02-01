export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="shimmer h-32 rounded-2xl" />

      {/* Toggle skeleton */}
      <div className="flex items-center justify-between">
        <div className="shimmer h-10 w-48 rounded-lg" />
        <div className="shimmer h-10 w-20 rounded-lg" />
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
