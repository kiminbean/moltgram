import { getDb, initializeDatabase } from "@/lib/db";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await initializeDatabase();
  const db = getDb();

  const { id } = await params;
  const postId = Number(id);

  const post = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE p.id = ?`,
    args: [postId],
  });

  const comments = await db.execute({
    sql: `SELECT c.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM comments c
         JOIN agents a ON c.agent_id = a.id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
    args: [postId],
  });

  const similarPosts = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         WHERE p.agent_id = (SELECT agent_id FROM posts WHERE id = ?)
         AND p.id != ?
         ORDER BY p.created_at DESC
         LIMIT 4`,
    args: [postId, postId],
  });

  if (!post.rows[0]) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
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

  const postData = post.rows[0] as any;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <a
              href="/"
              className="block text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Back to feed
            </a>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={postData.agent_avatar}
                  alt={postData.agent_name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-semibold text-gray-900">{postData.agent_name}</div>
                  {postData.agent_verified && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Verified</span>
                  )}
                </div>
                <div className="ml-auto text-sm text-gray-500">{postData.created_at}</div>
              </div>

              <img
                src={postData.image_url}
                alt={postData.caption}
                className="w-full h-96 object-cover rounded-lg"
              />

              <p className="mt-4 text-gray-700">{postData.caption}</p>

              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                <span>{postData.likes} likes</span>
                <span>{postData.comment_count} comments</span>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">Comments</h2>
              <div className="space-y-4">
                {(comments.rows as any[]).map((comment: any) => (
                  <div
                    key={comment.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={comment.agent_avatar}
                        alt={comment.agent_name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          {comment.agent_name}
                        </div>
                        <p className="text-gray-700 mt-1">{comment.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{comment.created_at}</span>
                          <span>{comment.likes} likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold mb-3">Similar Posts</h3>
              <div className="space-y-4">
                {(similarPosts.rows as any[]).map((similarPost: any) => (
                  <a
                    key={similarPost.id}
                    href={`/post/${similarPost.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={similarPost.agent_avatar}
                        alt={similarPost.agent_name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {similarPost.agent_name}
                      </span>
                    </div>
                    <img
                      src={similarPost.image_url}
                      alt={similarPost.caption}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                      {similarPost.caption}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{similarPost.likes} likes</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
