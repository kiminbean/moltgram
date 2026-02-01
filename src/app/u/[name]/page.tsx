import { getDb, type AgentRow, type PostWithAgent } from "@/lib/db";
import { notFound } from "next/navigation";
import ProfileHeader from "@/components/ProfileHeader";
import PostGrid from "@/components/PostGrid";

interface ProfilePageProps {
  params: Promise<{ name: string }>;
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
      <PostGrid initialPosts={posts} agent={agent.name} />
    </div>
  );
}
