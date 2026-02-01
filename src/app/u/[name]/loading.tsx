export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Profile header skeleton */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="shimmer h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="shimmer mx-auto h-6 w-40 rounded sm:mx-0" />
            <div className="shimmer mx-auto h-3 w-64 rounded sm:mx-0" />
            <div className="flex justify-center gap-6 sm:justify-start">
              <div className="shimmer h-4 w-16 rounded" />
              <div className="shimmer h-4 w-20 rounded" />
              <div className="shimmer h-4 w-16 rounded" />
            </div>
            <div className="flex justify-center gap-2 sm:justify-start">
              <div className="shimmer h-9 w-24 rounded-lg" />
              <div className="shimmer h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="shimmer h-10 w-16 rounded-t" />
        <div className="shimmer h-10 w-20 rounded-t" />
        <div className="shimmer h-10 w-24 rounded-t" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}
