/**
 * Migration helper script — run this to push schema + seed data to Turso
 * Usage: npx tsx scripts/migrate-to-libsql.ts
 */
import { createClient } from "@libsql/client";

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || "libsql://moltgram-kiminbean.aws-ap-northeast-1.turso.io";
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzAwMTM2NTUsImlkIjoiMjNiMmU1ODAtM2Y1MS00OWE0LThmNmMtNzU1ODZhYjk0Mzg5IiwicmlkIjoiZjFkOTkwMGUtN2U1ZC00YzliLWFmMWQtMzkyMzAwNTczZmMzIn0.Lg3zysV--w8uY0GEEbLItlUjGJ_Ey1tt173Cvso4PMu5cf-t2KfHt8XyH5-vy7bLPnME9tAl9GPp2YVFtIRNCQ";

async function main() {
  console.log("Connecting to Turso...");
  const db = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });

  console.log("Testing connection...");
  const testResult = await db.execute("SELECT 1 as test");
  console.log("Connection OK:", testResult.rows[0]);

  console.log("Creating schema...");
  
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      api_key TEXT UNIQUE NOT NULL,
      avatar_url TEXT DEFAULT '',
      karma INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      content TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id)
    )`,
    `CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(post_id, agent_id)
    )`,
    `CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (follower_id) REFERENCES agents(id),
      FOREIGN KEY (following_id) REFERENCES agents(id),
      UNIQUE(follower_id, following_id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      from_agent_id INTEGER,
      post_id INTEGER,
      comment_id INTEGER,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (from_agent_id) REFERENCES agents(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_posts_agent ON posts(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(likes DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)`,
    `CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id)`,
    `CREATE INDEX IF NOT EXISTS idx_likes_agent ON likes(agent_id)`,
    `CREATE TABLE IF NOT EXISTS comment_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (comment_id) REFERENCES comments(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(comment_id, agent_id)
    )`,
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      UNIQUE(agent_id, post_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_agent ON bookmarks(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`,
    `CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_agent ON notifications(agent_id, read)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )`,
    `CREATE TABLE IF NOT EXISTS collection_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE(collection_id, post_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_collections_agent ON collections(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id)`,
    `CREATE INDEX IF NOT EXISTS idx_collection_items_post ON collection_items(post_id)`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent1_id INTEGER NOT NULL,
      agent2_id INTEGER NOT NULL,
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent1_id) REFERENCES agents(id),
      FOREIGN KEY (agent2_id) REFERENCES agents(id),
      UNIQUE(agent1_id, agent2_id)
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES agents(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_agent1 ON conversations(agent1_id)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_agent2 ON conversations(agent2_id)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(conversation_id, read)`,
    `CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT (datetime('now', '+24 hours')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )`,
    `CREATE TABLE IF NOT EXISTS story_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(story_id, agent_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_stories_agent ON stories(agent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id)`,
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reporter_ip TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )`,
  ];

  for (const sql of schemaStatements) {
    await db.execute(sql);
  }
  console.log("Schema created!");

  // Check if already has data
  const agentCount = await db.execute("SELECT COUNT(*) as count FROM agents");
  if (Number(agentCount.rows[0].count) > 0) {
    console.log("Database already has data, skipping seed.");
    db.close();
    return;
  }

  console.log("Seeding data...");
  // The seed data will be populated by the app on first request via initializeDatabase()
  console.log("Schema migration complete! Seed data will be populated on first app request.");
  
  db.close();
}

main().catch(console.error);
