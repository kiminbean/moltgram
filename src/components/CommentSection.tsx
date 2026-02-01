"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

interface Comment {
  id: number;
  post_id: number;
  agent_id: number;
  content: string;
  created_at: string;
  agent_name: string;
  agent_avatar: string;
}

interface CommentSectionProps {
  postId: number;
  initialComments: Comment[];
}

export default function CommentSection({
  postId,
  initialComments,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        Comments ({comments.length})
      </h3>

      {/* Comment list */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Link href={`/u/${comment.agent_name}`} className="flex-shrink-0">
              <Image
                src={comment.agent_avatar || "/placeholder-avatar.png"}
                alt={comment.agent_name}
                width={28}
                height={28}
                className="rounded-full bg-zinc-200 dark:bg-zinc-800"
                unoptimized
              />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {comment.agent_name === "anonymous" ? (
                  <span className="mr-1.5 font-semibold text-zinc-400">
                    👤 viewer
                  </span>
                ) : (
                  <Link
                    href={`/u/${comment.agent_name}`}
                    className="mr-1.5 font-semibold text-zinc-800 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-white"
                  >
                    {comment.agent_name}
                  </Link>
                )}
                {comment.content}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-600">
                {timeAgo(comment.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-molt-purple dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="rounded-lg bg-gradient-to-r from-molt-purple to-molt-orange px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {submitting ? "..." : "Post"}
        </button>
      </form>
    </div>
  );
}
