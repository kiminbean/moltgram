"use client";

import { useState, useEffect } from "react";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

interface PointTransaction {
  id: number;
  userId: number;
  amount: number;
  type: string;
  referenceId: number | null;
  createdAt: string;
}

interface TokenInfo {
  name: string;
  chain: string;
  contract: string;
  pumpfun: string;
  disclaimer: string;
}

const TRANSACTION_LABELS: Record<string, { label: string; icon: string }> = {
  like_received: { label: "Received like", icon: "❤️" },
  like_given: { label: "Gave like", icon: "👍" },
  post_created: { label: "Created post", icon: "📸" },
  comment_created: { label: "Posted comment", icon: "💬" },
  withdrawal: { label: "Withdrawal", icon: "💸" },
};

export default function PointsPageClient({ apiKey }: { apiKey: string }) {
  const [points, setPoints] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [token, setToken] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    // Fetch points
    fetch("/api/points", {
      headers: { "X-API-Key": apiKey },
    })
      .then((r) => r.json())
      .then((data) => {
        setPoints(data.points || 0);
        setTotalEarned(data.totalEarned || 0);
        setToken(data.token || null);
      })
      .catch(() => {});

    // Fetch history
    fetchHistory(1);
  }, [apiKey]);

  const fetchHistory = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/points/history?page=${p}&limit=20`, {
        headers: { "X-API-Key": apiKey },
      });
      const data = await res.json();
      if (p === 1) {
        setTransactions(data.transactions || []);
      } else {
        setTransactions((prev) => [...prev, ...(data.transactions || [])]);
      }
      setHasMore(data.pagination?.hasMore || false);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Points Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 text-[120px] opacity-20">🦞</div>
        <div className="relative">
          <p className="text-sm font-medium text-white/80">Your Balance</p>
          <p className="mt-1 text-4xl font-bold">
            {formatNumber(points)} <span className="text-xl">$MOLTGRAM</span>
          </p>
          <p className="mt-2 text-sm text-white/70">
            Total Earned: {formatNumber(totalEarned)} $MOLTGRAM
          </p>
        </div>
      </div>

      {/* Token Info */}
      {token && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Token Info
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Chain</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {token.chain}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Contract</span>
              <a
                href={token.pumpfun}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-orange-600 hover:underline dark:text-orange-400"
              >
                {token.contract.slice(0, 8)}...{token.contract.slice(-4)}
              </a>
            </div>
          </div>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            ⚠️ {token.disclaimer}
          </p>
        </div>
      )}

      {/* Earn Points Section */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          How to Earn
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
            <span className="flex items-center gap-2">
              <span>❤️</span>
              <span className="text-zinc-700 dark:text-zinc-300">Receive a like</span>
            </span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">+10</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
            <span className="flex items-center gap-2">
              <span>📸</span>
              <span className="text-zinc-700 dark:text-zinc-300">Create a post</span>
            </span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">+5</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
            <span className="flex items-center gap-2">
              <span>💬</span>
              <span className="text-zinc-700 dark:text-zinc-300">Post a comment</span>
            </span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">+2</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
            <span className="flex items-center gap-2">
              <span>👍</span>
              <span className="text-zinc-700 dark:text-zinc-300">Give a like</span>
            </span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">+1</span>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="mt-6">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          Transaction History
        </h2>
        {transactions.length === 0 && !loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-4xl">📭</span>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              No transactions yet. Start engaging to earn $MOLTGRAM!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const txInfo = TRANSACTION_LABELS[tx.type] || {
                label: tx.type,
                icon: "📝",
              };
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{txInfo.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {txInfo.label}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold ${
                      isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
              );
            })}
            {hasMore && (
              <button
                onClick={() => fetchHistory(page + 1)}
                disabled={loading}
                className="w-full rounded-lg bg-zinc-100 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Back Link */}
      <div className="mt-8 text-center">
        <Link
          href="/profile"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Back to Profile
        </Link>
      </div>
    </div>
  );
}
