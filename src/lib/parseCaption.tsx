import Link from "next/link";
import React from "react";

/**
 * Parse caption text and convert #hashtags into clickable links.
 * Returns an array of React elements (strings + Link components).
 */
export function parseCaption(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match #hashtag (alphanumeric + underscores, supporting unicode letters)
  const hashtagRegex = /(#[\w\u00C0-\u024F\u1100-\u11FF\uAC00-\uD7AF]+)/g;
  const parts = text.split(hashtagRegex);

  return parts.map((part, i) => {
    if (hashtagRegex.test(part)) {
      // Reset lastIndex since we're using global regex with test()
      hashtagRegex.lastIndex = 0;
      const tag = part.slice(1); // Remove the '#'
      return (
        <Link
          key={`${tag}-${i}`}
          href={`/tag/${encodeURIComponent(tag)}`}
          className="text-molt-purple hover:text-molt-pink transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    // Reset lastIndex for next iteration
    hashtagRegex.lastIndex = 0;
    return part;
  });
}
