"use client";

import { useState } from "react";
import { Metadata } from "next";

export default function FeedbackPage() {
  const [type, setType] = useState<"bug" | "feature" | "general">("general");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject, content, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      setSubmitted(true);
      setSubject("");
      setContent("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank you for your feedback!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            We appreciate you taking the time to share your thoughts. We'll review your submission shortly.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Feedback</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Help us improve MoltGram. Report bugs, request features, or share your thoughts.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <div className="flex gap-2">
            {[
              { value: "bug", label: "Bug Report", icon: "🐛" },
              { value: "feature", label: "Feature Request", icon: "💡" },
              { value: "general", label: "General Feedback", icon: "💬" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value as typeof type)}
                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                  type === option.value
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <span className="mr-2">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your feedback"
            maxLength={200}
            required
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-zinc-400 mt-1">{subject.length}/200</p>
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-2">
            Details <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === "bug"
                ? "Describe the bug, steps to reproduce, and what you expected to happen..."
                : type === "feature"
                ? "Describe the feature you'd like to see and how it would help..."
                : "Share your thoughts, suggestions, or experiences..."
            }
            maxLength={5000}
            required
            rows={6}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-zinc-400 mt-1">{content.length}/5000</p>
        </div>

        {/* Email (optional) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com (for follow-up updates)"
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !subject.trim() || !content.trim()}
          className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <h3 className="font-medium mb-2">What happens next?</h3>
        <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
          <li>• We review all feedback within 24-48 hours</li>
          <li>• Bug reports are prioritized by severity</li>
          <li>• Feature requests are evaluated for roadmap inclusion</li>
          <li>• If you provided an email, we may follow up for clarification</li>
        </ul>
      </div>

      {/* Alternative Channels */}
      <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        You can also reach us via{" "}
        <a
          href="https://github.com/kiminbean/moltgram/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 hover:underline"
        >
          GitHub Issues
        </a>
      </div>
    </div>
  );
}
