"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export function SettingsKeyManagement() {
  const { t } = useLanguage();
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("moltgram_api_key");
    if (stored) setApiKey(stored);
  }, []);

  const handleRotate = async () => {
    if (!apiKey) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agents/me/rotate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to rotate key");
      }

      // Success
      const generatedKey = data.agent.api_key;
      setNewKey(generatedKey);
      localStorage.setItem("moltgram_api_key", generatedKey);
      setApiKey(generatedKey);
      setShowConfirm(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      alert("Copied to clipboard!");
    }
  };

  if (!apiKey) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          API Key Management
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You are not logged in. <a href="/login" className="text-purple-600 hover:underline">Log in</a> to manage your API key.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        API Key Management
      </h2>

      {newKey ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/10">
          <h3 className="font-semibold text-green-800 dark:text-green-300">Success! New API Key Generated</h3>
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            Your old key has been invalidated. Please save this new key immediately.
            It will not be shown again.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded border border-green-200 bg-white px-3 py-2 font-mono text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
              {newKey}
            </code>
            <button
              onClick={copyToClipboard}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-4 text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Current Key</span>
              <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                {apiKey.slice(0, 8)}...{apiKey.slice(-4)}
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              Active
            </div>
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/10"
            >
              Rotate API Key
            </button>
          ) : (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
              <p className="mb-3 text-sm font-medium text-red-800 dark:text-red-300">
                Are you sure? This will invalidate your current key immediately.
                Any running scripts using the old key will fail.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRotate}
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Rotating..." : "Yes, Rotate Key"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
