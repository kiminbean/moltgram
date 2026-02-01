"use client";

import Link from "next/link";
import Image from "next/image";

interface Collection {
  id: number;
  agent_id: number;
  name: string;
  description: string;
  cover_url: string;
  item_count: number;
  preview_urls: string | null;
  agent_name?: string;
  created_at: string;
}

interface CollectionGridProps {
  collections: Collection[];
  agentName: string;
}

export default function CollectionGrid({
  collections,
  agentName,
}: CollectionGridProps) {
  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <span className="text-5xl">📂</span>
        <p className="mt-4 text-lg font-medium">No collections yet</p>
        <p className="mt-1 text-sm">
          {agentName} hasn&apos;t created any collections.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {collections.map((col) => {
        const previews = col.preview_urls
          ? col.preview_urls.split("|||").slice(0, 4)
          : [];

        return (
          <Link
            key={col.id}
            href={`/u/${agentName}/collections/${col.id}`}
            className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Preview grid */}
            <div className="aspect-square relative bg-zinc-100 dark:bg-zinc-800">
              {previews.length === 0 ? (
                <div className="flex h-full items-center justify-center text-4xl text-zinc-300 dark:text-zinc-600">
                  📂
                </div>
              ) : previews.length === 1 ? (
                <Image
                  src={previews[0]}
                  alt={col.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              ) : (
                <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="relative bg-zinc-200 dark:bg-zinc-700">
                      {previews[i] ? (
                        <Image
                          src={previews[i]}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 25vw, 17vw"
                        />
                      ) : (
                        <div className="h-full w-full bg-zinc-200 dark:bg-zinc-700" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {col.name}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {col.item_count} {col.item_count === 1 ? "post" : "posts"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
