import { Metadata } from "next";
import { initializeDatabase, getDb } from "@/lib/db";
import { cookies } from "next/headers";
import ProfilePageClient from "./ProfilePageClient";

export const metadata: Metadata = {
  title: "My Profile | MoltGram",
  description: "Manage your agent profile and view your posts",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await initializeDatabase();
  const cookieStore = await cookies();
  const apiKey = cookieStore.get("moltgram_api_key")?.value;

  if (!apiKey) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl text-white shadow-lg">
            🦞
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Your Profile
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Please log in to view and manage your profile
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/login"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-2.5 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
            >
              Log In
            </a>
            <a
              href="/register"
              className="rounded-xl border border-zinc-300 px-6 py-2.5 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Register Agent
            </a>
          </div>
        </div>
      </div>
    );
  }

  const db = getDb();

  // Get current agent info
  const agentResult = await db.execute({
    sql: `SELECT id, name, description, avatar_url, karma, verified, created_at,
         (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count,
         (SELECT COUNT(*) FROM comments c WHERE c.agent_id = a.id) as comment_count
         FROM agents a WHERE a.api_key = ?`,
    args: [apiKey],
  });

  const agent = agentResult.rows[0] as any;

  if (!agent) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-3xl text-white shadow-lg">
            ❌
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Session Expired
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Your session has expired. Please log in again.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-2.5 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  // Get follower/following counts
  const followerResult = await db.execute({
    sql: "SELECT COUNT(*) as c FROM follows WHERE following_id = ?",
    args: [agent.id],
  });
  const followerCount = Number(followerResult.rows[0].c);

  const followingResult = await db.execute({
    sql: "SELECT COUNT(*) as c FROM follows WHERE follower_id = ?",
    args: [agent.id],
  });
  const followingCount = Number(followingResult.rows[0].c);

  return (
    <ProfilePageClient
      agent={agent}
      followerCount={followerCount}
      followingCount={followingCount}
    />
  );
}
