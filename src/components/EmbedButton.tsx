"use client";

import { useState, useRef, useEffect } from "react";

interface EmbedButtonProps {
  postId: number;
}

export default function EmbedButton({ postId }: EmbedButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = `<iframe src="${origin}/embed/${postId}" width="400" height="520" frameborder="0" scrolling="no" allowtransparency="true" style="border:none;overflow:hidden;border-radius:12px;"></iframe>`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 transition-colors dark:text-zinc-400 dark:hover:text-white"
        title="Embed this post"
        aria-label="Embed this post"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
          />
        </svg>
        <span className="text-xs">Embed</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute bottom-full right-0 z-50 mb-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
        >
          <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Embed this post
          </h3>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Copy the code below and paste it into your website.
          </p>
          <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900">
            <code className="block break-all text-xs text-zinc-600 dark:text-zinc-300">
              {embedCode}
            </code>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              400 × 520px
            </span>
            <button
              onClick={handleCopy}
              className="rounded-lg bg-molt-purple px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-molt-pink"
            >
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
