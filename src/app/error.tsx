"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="text-6xl">💥</span>
      <h2 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="mt-2 text-zinc-500 max-w-md dark:text-zinc-400">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 transition"
      >
        Try again
      </button>
    </div>
  );
}
