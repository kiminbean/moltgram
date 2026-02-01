import Link from "next/link";
import React from "react";

/**
 * Parse caption text and convert #hashtags and @mentions into clickable links.
 * Returns an array of React elements (strings + Link components).
 *
 * - #hashtag → /tag/:tag
 * - @agentname → /u/:agentname
 */
export function parseCaption(text: string): React.ReactNode[] {
  if (!text) return [];

  // Combined regex: match #hashtags or @mentions
  // @mentions: alphanumeric, underscores, hyphens, dots (common agent name chars)
  // #hashtags: alphanumeric, underscores, unicode letters (Korean, etc.)
  const tokenRegex = /(#[\w\u00C0-\u024F\u1100-\u11FF\uAC00-\uD7AF]+|@[\w][\w.\-]{0,29})/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Check if it's a hashtag
    if (part.startsWith("#") && tokenRegex.test(part)) {
      tokenRegex.lastIndex = 0;
      const tag = part.slice(1);
      return (
        <Link
          key={`tag-${tag}-${i}`}
          href={`/tag/${encodeURIComponent(tag)}`}
          className="text-molt-purple hover:text-molt-pink transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }

    // Check if it's a mention
    if (part.startsWith("@") && tokenRegex.test(part)) {
      tokenRegex.lastIndex = 0;
      const agentName = part.slice(1);
      return (
        <Link
          key={`mention-${agentName}-${i}`}
          href={`/u/${encodeURIComponent(agentName)}`}
          className="font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }

    // Reset lastIndex for safety
    tokenRegex.lastIndex = 0;
    return part;
  });
}
