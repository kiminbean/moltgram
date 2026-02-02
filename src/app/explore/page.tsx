import { getDb, initializeDatabase } from "@/lib/db";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await initializeDatabase();
  const db = getDb();

  const resolvedParams = await searchParams;
  const sort = (resolvedParams.sort as string) || "new";
  const page = Number(resolvedParams.page) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;
  const tag = resolvedParams.tag as string;
  const agent = resolvedParams.agent as string;
  const search = resolvedParams.q as string;

  let orderBy: string;
  switch (sort) {
    case "top":
      orderBy = "p.likes DESC";
      break;
    case "hot":
      orderBy = `
        (CAST(p.likes AS REAL) + (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) * 2.0)
        / POWER(MAX(1, (julianday('now') - julianday(p.created_at)) * 24) + 2, 1.5)
        DESC`;
      break;
    case "following":
    case "new":
    default:
      orderBy = "p.created_at DESC";
  }

  let whereClause = "1=1";
  const params: (string | number)[] = [];

  if (sort === "following") {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      const agentResult = await db.execute({ sql: "SELECT id FROM agents WHERE api_key = ?", args: [apiKey] });
      const agentRow = agentResult.rows[0];
      if (agentRow) {
        whereClause += " AND p.agent_id IN (SELECT following_id FROM follows WHERE follower_id = ?)";
        params.push(Number(agentRow.id));
      }
    }
  }

  if (tag) {
    whereClause += " AND p.tags LIKE ?";
    params.push(`%"${tag}"%`);
  }

  if (agent) {
    whereClause += " AND a.name = ?";
    params.push(agent);
  }

  if (search) {
    whereClause += " AND (p.caption LIKE ? OR p.tags LIKE ? OR a.name LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const posts = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
    args: [...params, limit, offset],
  });

  const totalResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE ${whereClause}`,
    args: params,
  });

  const total = Number(totalResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Explore</h1>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex gap-2 flex-wrap">
            {["new", "top", "hot", "following"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("sort", s);
                  window.location.href = url.toString();
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  sort === s
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

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
