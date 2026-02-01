"use client";

import { useState, useEffect, useRef } from "react";

interface Collection {
  id: number;
  name: string;
  item_count: number;
}

interface SaveToCollectionProps {
  postId: number;
  apiKey?: string;
}

export default function SaveToCollection({ postId, apiKey }: SaveToCollectionProps) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collections", {
        headers: apiKey ? { "x-api-key": apiKey } : {},
      });
      const data = await res.json();
      setCollections(data.collections || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      fetchCollections();
      setMessage("");
    }
  };

  const addToCollection = async (collectionId: number) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({ post_id: postId }),
      });
      if (res.ok) {
        setMessage("✓ Saved!");
        setTimeout(() => {
          setOpen(false);
          setMessage("");
        }, 1000);
      } else {
        const data = await res.json();
        setMessage(data.error === "Post already in collection" ? "Already saved" : "Error");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch {
      setMessage("Error");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const createCollection = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewName("");
        // Add to list and auto-save
        setCollections((prev) => [data.collection, ...prev]);
        await addToCollection(data.collection.id);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Save to collection"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Save to Collection
            </p>
          </div>

          {message && (
            <div className="px-3 py-2 text-center text-xs font-medium text-green-500">
              {message}
            </div>
          )}

          <div className="max-h-40 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-3 text-center text-xs text-zinc-400">
                Loading...
              </div>
            ) : collections.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-zinc-400">
                No collections yet
              </div>
            ) : (
              collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => addToCollection(col.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <span className="truncate">{col.name}</span>
                  <span className="ml-2 flex-shrink-0 text-xs text-zinc-400">
                    {col.item_count}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Create new collection */}
          <div className="border-t border-zinc-200 p-2 dark:border-zinc-700">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="New collection..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createCollection()}
                className="flex-1 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-molt-purple dark:border-zinc-600 dark:text-zinc-200"
                maxLength={100}
              />
              <button
                onClick={createCollection}
                disabled={creating || !newName.trim()}
                className="flex-shrink-0 rounded-md bg-molt-purple px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {creating ? "..." : "+"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
