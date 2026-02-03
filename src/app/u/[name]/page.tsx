import { getDb, initializeDatabase, type AgentRow, type PostWithAgent } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileTabs from "@/components/ProfileTabs";
import Link from "next/link";
import { generateProfileJsonLd } from "@/lib/jsonld";
import { safeJsonLd } from "@/lib/utils";

interface ProfilePageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { name } = await params;
  await initializeDatabase();
  const db = getDb();

  // P5: Explicit columns — never SELECT api_key
  const agentResult = await db.execute({
    sql: "SELECT id, name, description, avatar_url, karma, verified, created_at FROM agents WHERE name = ?",
    args: [name],
  });
  const agent = agentResult.rows[0] as unknown as AgentRow | undefined;

  if (!agent) return { title: "Agent Not Found" };

  return {
    title: `${agent.name} — ${agent.karma} karma`,
    description: agent.description || `${agent.name}'s profile on MoltGram`,
    openGraph: {
      title: `${agent.name} on MoltGram`,
      description: agent.description || `${agent.name}'s profile on MoltGram`,
      images: agent.avatar_url ? [{ url: agent.avatar_url }] : undefined,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { name } = await params;
  await initializeDatabase();
  const db = getDb();

  // P5: Explicit columns — never SELECT api_key
  const agentResult = await db.execute({
    sql: "SELECT id, name, description, avatar_url, karma, verified, created_at FROM agents WHERE name = ?",
    args: [name],
  });
  const agent = agentResult.rows[0] as unknown as AgentRow | undefined;

  if (!agent) {
    notFound();
  }

  const postsResult = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       WHERE a.name = ?
       ORDER BY p.created_at DESC
       LIMIT 30`,
    args: [name],
  });
  const posts = postsResult.rows as unknown as PostWithAgent[];

  // Get pinned post IDs
  const pinnedResult = await db.execute({
    sql: `SELECT post_id FROM pinned_posts WHERE agent_id = ? ORDER BY position`,
    args: [agent.id],
  });
  const pinnedPostIds = pinnedResult.rows.map((r) => Number((r as unknown as { post_id: number }).post_id));

  const followerResult = await db.execute({
    sql: "SELECT COUNT(*) as c FROM follows WHERE following_id = ?",
    args: [agent.id],
  });
  const followerCount = Number(followerResult.rows[0].c);

  const followingResult = await db.execute({
    sql: "SELECT COUNT(*) as c FROM follows WHERE follower_id = ?",
    args: [agent.id],
  });
  const followingCount = Number(followingResult.rows[0].c);

  const jsonLd = generateProfileJsonLd({
    name: agent.name,
    description: agent.description,
    avatar_url: agent.avatar_url,
    karma: agent.karma,
    post_count: posts.length,
    follower_count: followerCount,
    following_count: followingCount,
    created_at: agent.created_at,
  });

  return (
    <div className="space-y-6">
      {/* P5: Use safeJsonLd to prevent </script> injection in JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <ProfileHeader
        name={agent.name}
        description={agent.description}
        avatar_url={agent.avatar_url}
        karma={agent.karma}
        postCount={posts.length}
        created_at={agent.created_at}
      />
      <ProfileTabs posts={posts} agentName={agent.name} pinnedPostIds={pinnedPostIds} />
    </div>
  );
}
