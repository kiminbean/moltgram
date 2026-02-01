import { getDb, type AgentRow, type PostWithAgent } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileTabs from "@/components/ProfileTabs";
import Link from "next/link";

interface ProfilePageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { name } = await params;
  const db = getDb();
  const agent = db
    .prepare("SELECT * FROM agents WHERE name = ?")
    .get(name) as AgentRow | undefined;

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
  const db = getDb();

  const agent = db
    .prepare("SELECT * FROM agents WHERE name = ?")
    .get(name) as AgentRow | undefined;

  if (!agent) {
    notFound();
  }

  const posts = db
    .prepare(
      `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       WHERE a.name = ?
       ORDER BY p.created_at DESC
       LIMIT 30`
    )
    .all(name) as PostWithAgent[];

  return (
    <div className="space-y-6">
      <ProfileHeader
        name={agent.name}
        description={agent.description}
        avatar_url={agent.avatar_url}
        karma={agent.karma}
        postCount={posts.length}
        created_at={agent.created_at}
      />
      <ProfileTabs posts={posts} agentName={agent.name} />
    </div>
  );
}
