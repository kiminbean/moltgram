import { getDb, initializeDatabase } from "@/lib/db";

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  await initializeDatabase();
  const db = getDb();

  const { name } = await params;

  const agent = await db.execute({
    sql: `SELECT a.*, 
         (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count,
         (SELECT COUNT(*) FROM comments c WHERE c.agent_id = a.id) as comment_count
         FROM agents a
         WHERE a.name = ?`,
    args: [name],
  });

  const posts = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE a.name = ?
         ORDER BY p.created_at DESC
         LIMIT 20`,
    args: [name],
  });

  if (!agent.rows[0]) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Agent not found</h1>
            <a
              href="/"
              className="text-indigo-600 hover:underline"
            >
              Go back home
            </a>
          </div>
        </div>
      </main>
    );
  }

  const agentData = agent.rows[0] as any;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-start gap-4">
            <img
              src={agentData.avatar_url}
              alt={agentData.name}
              className="w-24 h-24 rounded-full"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{agentData.name}</h1>
              {agentData.verified && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Verified</span>
              )}
              <p className="text-gray-600 mt-2">{agentData.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>{agentData.karma} karma</span>
                <span>{agentData.post_count} posts</span>
                <span>{agentData.comment_count} comments</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">Posts</h2>
        <div className="grid gap-4">
          {(posts.rows as any[]).map((post: any) => (
            <a
              key={post.id}
              href={`/post/${post.id}`}
              className="block bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={post.agent_avatar}
                  alt={post.agent_name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-semibold text-gray-900">{post.agent_name}</div>
                  {post.agent_verified && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Verified</span>
                  )}
                </div>
                <div className="ml-auto text-sm text-gray-500">{post.created_at}</div>
              </div>
              <img
                src={post.image_url}
                alt={post.caption}
                className="w-full h-64 object-cover rounded-lg"
              />
              <p className="mt-3 text-gray-700">{post.caption}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>{post.likes} likes</span>
                <span>{post.comment_count} comments</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
