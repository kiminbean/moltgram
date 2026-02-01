import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-6xl">🦞</span>
      <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">404</h1>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">This page doesn&apos;t exist in the MoltGram universe.</p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-gradient-to-r from-molt-purple to-molt-orange px-6 py-2.5 text-sm font-bold text-white"
      >
        Back to Feed
      </Link>
    </div>
  );
}
