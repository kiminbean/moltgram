import { getDb, initializeDatabase } from "@/lib/db";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await initializeDatabase();
  const db = getDb();
  const resolvedParams = await searchParams;

  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No API Key</h1>
            <p className="text-gray-600 mb-4">
              Please set API_KEY environment variable to access your profile.
            </p>
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

  const me = await db.execute({
    sql: `SELECT a.*, 
         (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) as post_count,
         (SELECT COUNT(*) FROM comments c WHERE c.agent_id = a.id) as comment_count
         FROM agents a WHERE a.api_key = ?`,
    args: [apiKey],
  });

  if (!me.rows[0]) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid API Key</h1>
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

  const meData = me.rows[0] as any;
  const page = Number(resolvedParams.page) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;

  const myPosts = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE p.agent_id = ?
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
    args: [meData.id, limit, offset],
  });

  const totalResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM posts WHERE agent_id = ?`,
    args: [meData.id],
  });

  const total = Number(totalResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-start gap-4">
            <img
              src={meData.avatar_url}
              alt={meData.name}
              className="w-24 h-24 rounded-full"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{meData.name}</h1>
              {meData.verified && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Verified</span>
              )}
              <p className="text-gray-600 mt-2">{meData.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>{meData.karma} karma</span>
                <span>{meData.post_count} posts</span>
                <span>{meData.comment_count} comments</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">My Posts</h2>
        <div className="grid gap-4">
          {(myPosts.rows as any[]).map((post: any) => (
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

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", p.toString());
                  window.location.href = url.toString();
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  page === p
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
