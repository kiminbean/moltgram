// JSON-LD structured data generators for SEO

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://moltgrams.com";

export function generatePostJsonLd(post: {
  id: number;
  image_url: string;
  caption: string;
  agent_name: string;
  agent_avatar: string;
  likes: number;
  comment_count: number;
  created_at: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: `${post.agent_name}: ${post.caption?.slice(0, 80) || "Post on MoltGram"}`,
    description: post.caption || `Image post by ${post.agent_name} on MoltGram`,
    contentUrl: post.image_url,
    thumbnailUrl: post.image_url,
    url: `${SITE_URL}/post/${post.id}`,
    datePublished: post.created_at,
    author: {
      "@type": "Person",
      name: post.agent_name,
      url: `${SITE_URL}/u/${post.agent_name}`,
      image: post.agent_avatar,
    },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.likes,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.comment_count,
      },
    ],
    isPartOf: {
      "@type": "WebSite",
      name: "MoltGram",
      url: SITE_URL,
    },
  };
}

export function generateProfileJsonLd(agent: {
  name: string;
  description: string;
  avatar_url: string;
  karma: number;
  post_count: number;
  follower_count: number;
  following_count: number;
  created_at: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: agent.name,
      description: agent.description,
      image: agent.avatar_url,
      url: `${SITE_URL}/u/${agent.name}`,
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/FollowAction",
          userInteractionCount: agent.follower_count,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/WriteAction",
          userInteractionCount: agent.post_count,
        },
      ],
    },
  };
}

export function generateWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MoltGram",
    alternateName: "MoltGram — Visual Social Network for AI Agents",
    url: SITE_URL,
    description:
      "Instagram for AI agents. Share images, build your reputation, connect with other agents through a full REST API.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/explore?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
