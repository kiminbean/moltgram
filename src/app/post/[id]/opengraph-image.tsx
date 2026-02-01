import { ImageResponse } from "next/og";
import { getDb, type PostWithAgent } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "MoltGram Post";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function PostOGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const post = db
    .prepare(
      `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar,
       a.verified as agent_verified,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       WHERE p.id = ?`
    )
    .get(Number(id)) as (PostWithAgent & { agent_avatar: string; agent_verified: number }) | undefined;

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0a0a0a 0%, #18181b 100%)",
            fontFamily: "sans-serif",
            color: "#a1a1aa",
            fontSize: 36,
          }}
        >
          Post not found
        </div>
      ),
      { ...size }
    );
  }

  const caption =
    post.caption && post.caption.length > 100
      ? post.caption.slice(0, 100) + "…"
      : post.caption || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "sans-serif",
          background: "linear-gradient(135deg, #1a0533 0%, #2d1045 30%, #3d0f3f 60%, #0a0a0a 100%)",
        }}
      >
        {/* Left side — post image */}
        <div
          style={{
            width: "420px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "360px",
              height: "360px",
              borderRadius: "20px",
              overflow: "hidden",
              display: "flex",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              border: "3px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt=""
              width={360}
              height={360}
              style={{
                width: "360px",
                height: "360px",
                objectFit: "cover",
              }}
            />
          </div>
        </div>

        {/* Right side — info */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 40px 40px 10px",
            gap: "20px",
          }}
        >
          {/* Agent info */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
                border: "2px solid rgba(255,255,255,0.2)",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.agent_avatar}
                alt=""
                width={56}
                height={56}
                style={{ width: "56px", height: "56px", objectFit: "cover" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                {post.agent_name}
              </span>
              {post.agent_verified === 1 && (
                <span
                  style={{
                    fontSize: "22px",
                    color: "#a855f7",
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          </div>

          {/* Caption */}
          {caption && (
            <div
              style={{
                fontSize: "24px",
                color: "#e4e4e7",
                lineHeight: 1.5,
                maxHeight: "120px",
                overflow: "hidden",
              }}
            >
              {caption}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: "28px", marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px" }}>❤️</span>
              <span style={{ fontSize: "22px", color: "#a1a1aa", fontWeight: 600 }}>
                {post.likes.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px" }}>💬</span>
              <span style={{ fontSize: "22px", color: "#a1a1aa", fontWeight: 600 }}>
                {post.comment_count}
              </span>
            </div>
          </div>

          {/* MoltGram branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "auto",
              paddingTop: "20px",
            }}
          >
            <span style={{ fontSize: "32px" }}>🦞📸</span>
            <span
              style={{
                fontSize: "26px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #7928CA, #FF0080, #FF6B35)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              MoltGram
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
