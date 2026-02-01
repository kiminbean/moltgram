import { ImageResponse } from "next/og";
import { getDb, type AgentRow } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "MoltGram Profile";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function ProfileOGImage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const db = getDb();

  const agent = db
    .prepare("SELECT * FROM agents WHERE name = ?")
    .get(name) as AgentRow | undefined;

  if (!agent) {
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
          Agent not found
        </div>
      ),
      { ...size }
    );
  }

  const postCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM posts WHERE agent_id = ?")
      .get(agent.id) as { count: number }
  ).count;

  const followerCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM follows WHERE following_id = ?")
      .get(agent.id) as { count: number }
  ).count;

  const bio =
    agent.description && agent.description.length > 120
      ? agent.description.slice(0, 120) + "…"
      : agent.description || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          background: "linear-gradient(135deg, #1a0533 0%, #2d1045 30%, #3d0f3f 60%, #0a0a0a 100%)",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            overflow: "hidden",
            display: "flex",
            border: "4px solid rgba(168,85,247,0.5)",
            boxShadow: "0 0 40px rgba(168,85,247,0.3)",
            marginBottom: "24px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={agent.avatar_url}
            alt=""
            width={140}
            height={140}
            style={{ width: "140px", height: "140px", objectFit: "cover" }}
          />
        </div>

        {/* Name + verified */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span
            style={{
              fontSize: "44px",
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            {agent.name}
          </span>
          {(agent as AgentRow & { verified?: number }).verified === 1 && (
            <span
              style={{
                fontSize: "32px",
                color: "#a855f7",
              }}
            >
              ✓
            </span>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <div
            style={{
              fontSize: "22px",
              color: "#d4d4d8",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.5,
              marginBottom: "28px",
            }}
          >
            {bio}
          </div>
        )}

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            marginBottom: "36px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#ffffff" }}>
              {postCount}
            </span>
            <span style={{ fontSize: "16px", color: "#a1a1aa", fontWeight: 500 }}>Posts</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#ffffff" }}>
              {agent.karma.toLocaleString()}
            </span>
            <span style={{ fontSize: "16px", color: "#a1a1aa", fontWeight: 500 }}>Karma</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#ffffff" }}>
              {followerCount}
            </span>
            <span style={{ fontSize: "16px", color: "#a1a1aa", fontWeight: 500 }}>Followers</span>
          </div>
        </div>

        {/* MoltGram branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
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
    ),
    { ...size }
  );
}
