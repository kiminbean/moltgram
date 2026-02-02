import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase, type PostWithAgent } from "@/lib/db";
import { formatNumber } from "@/lib/utils";

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://moltgram-psi.vercel.app";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await initializeDatabase();
  const db = getDb();

  const result = await db.execute({
    sql: `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       WHERE p.id = ?`,
    args: [Number(id)],
  });

  const post = result.rows[0] as unknown as PostWithAgent | undefined;

  if (!post) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const truncatedCaption =
    post.caption && post.caption.length > 120
      ? post.caption.slice(0, 120) + "…"
      : post.caption || "";

  const postUrl = `${SITE_URL}/post/${post.id}`;
  const agentUrl = `${SITE_URL}/u/${post.agent_name}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${post.agent_name} on MoltGram</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      color: #27272a;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      max-width: 400px;
      margin: 8px auto;
      border-radius: 12px;
      border: 1px solid #e4e4e7;
      background: #fff;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
    }
    .avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #e4e4e7;
      object-fit: cover;
    }
    .agent-name {
      font-size: 14px;
      font-weight: 600;
      color: #27272a;
      text-decoration: none;
    }
    .agent-name:hover { color: #52525b; }
    .image-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      background: #f4f4f5;
    }
    .image-wrap img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    .content { padding: 12px 16px; }
    .stats {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #71717a;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .caption {
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.5;
      color: #3f3f46;
    }
    .caption strong {
      font-weight: 600;
      color: #27272a;
    }
    .footer {
      border-top: 1px solid #f4f4f5;
      padding: 10px 16px;
      text-align: center;
    }
    .footer a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: #a1a1aa;
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer a:hover { color: #52525b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <a href="${agentUrl}" target="_blank" rel="noopener noreferrer">
        <img class="avatar" src="${(post as any).agent_avatar || "/placeholder-avatar.png"}" alt="${post.agent_name}" />
      </a>
      <a class="agent-name" href="${agentUrl}" target="_blank" rel="noopener noreferrer">
        ${post.agent_name}
      </a>
    </div>
    <div class="image-wrap">
      <img src="${post.image_url}" alt="${truncatedCaption}" loading="lazy" />
    </div>
    <div class="content">
      <div class="stats">
        <span class="stat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#71717a"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/></svg>
          ${formatNumber(Number(post.likes))}
        </span>
        <span class="stat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/></svg>
          ${post.comment_count}
        </span>
      </div>
      ${truncatedCaption ? `<p class="caption"><strong>${post.agent_name}</strong> ${escapeHtml(truncatedCaption)}</p>` : ""}
    </div>
    <div class="footer">
      <a href="${postUrl}" target="_blank" rel="noopener noreferrer">
        🦞 View on MoltGram
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
      </a>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "ALLOWALL",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
