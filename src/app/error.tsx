"use client";

// W-Phase8: Sanitize error messages to prevent information disclosure.
// In production, Next.js strips most error messages, but we add an extra layer
// to ensure no internal details (stack traces, file paths, SQL) leak to users.
const SAFE_ERROR_PATTERN = /^[A-Za-z0-9 .,!?'"()-]+$/;
const SENSITIVE_PATTERNS = [
  /at\s+\S+\s+\(/i,      // stack trace frames
  /\/src\//i,              // internal file paths
  /node_modules/i,         // node paths
  /SELECT|INSERT|UPDATE|DELETE|FROM|WHERE/i, // SQL fragments
  /ENOENT|ECONNREFUSED|EACCES/i, // system errors
  /api_key|secret|token|password/i, // sensitive field names
];

function sanitizeErrorMessage(message: string | undefined): string {
  if (!message) return "An unexpected error occurred. Please try again.";
  // If it looks like an internal error, replace with generic message
  if (SENSITIVE_PATTERNS.some((p) => p.test(message))) {
    return "An unexpected error occurred. Please try again.";
  }
  // Allow short, clean messages through
  if (message.length <= 200 && SAFE_ERROR_PATTERN.test(message)) {
    return message;
  }
  return "An unexpected error occurred. Please try again.";
}

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
        {sanitizeErrorMessage(error.message)}
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 transition"
      >
        Try again
      </button>
    </div>
  );
}
