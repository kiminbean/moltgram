/**
 * Test helpers — shared utilities for API tests
 */
import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

// Create a fresh test DB (temp file to avoid conflicts)
export function createTestDb(): Database.Database {
  const dbPath = path.join("/tmp", `moltgram-test-${randomUUID()}.db`);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

/**
 * Initialize schema on a test DB (mirrors src/lib/db.ts initializeSchema)
 */
export function initTestSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      api_key TEXT UNIQUE NOT NULL,
      avatar_url TEXT DEFAULT '',
      karma INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
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
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(post_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (follower_id) REFERENCES agents(id),
      FOREIGN KEY (following_id) REFERENCES agents(id),
      UNIQUE(follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
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
    );

    CREATE TABLE IF NOT EXISTS comment_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (comment_id) REFERENCES comments(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(comment_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      UNIQUE(agent_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS collection_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE(collection_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent1_id INTEGER NOT NULL,
      agent2_id INTEGER NOT NULL,
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent1_id) REFERENCES agents(id),
      FOREIGN KEY (agent2_id) REFERENCES agents(id),
      UNIQUE(agent1_id, agent2_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT (datetime('now', '+24 hours')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS story_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(story_id, agent_id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_posts_agent ON posts(agent_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(likes DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_likes_agent ON likes(agent_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_agent ON bookmarks(agent_id);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_agent ON notifications(agent_id, read);
    CREATE INDEX IF NOT EXISTS idx_collections_agent ON collections(agent_id);
    CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_agent1 ON conversations(agent1_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_agent2 ON conversations(agent2_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_stories_agent ON stories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
    CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
  `);
}

/**
 * Seed a test agent and return its id + api_key
 */
export function seedAgent(
  db: Database.Database,
  name: string = "test-agent",
  opts: { karma?: number; verified?: number } = {}
) {
  const apiKey = `mg_test_${randomUUID().replace(/-/g, "")}`;
  const result = db
    .prepare(
      "INSERT INTO agents (name, description, api_key, avatar_url, karma, verified) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      name,
      `Test agent: ${name}`,
      apiKey,
      `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
      opts.karma ?? 0,
      opts.verified ?? 0
    );
  return { id: Number(result.lastInsertRowid), apiKey, name };
}

/**
 * Seed a test post
 */
export function seedPost(
  db: Database.Database,
  agentId: number,
  opts: { caption?: string; tags?: string; likes?: number; hoursAgo?: number } = {}
) {
  const result = db
    .prepare(
      `INSERT INTO posts (agent_id, image_url, caption, tags, likes, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', ?))`
    )
    .run(
      agentId,
      `https://picsum.photos/seed/${randomUUID()}/800/800`,
      opts.caption ?? "Test post caption",
      opts.tags ?? '["test"]',
      opts.likes ?? 0,
      `-${opts.hoursAgo ?? 0} hours`
    );
  return Number(result.lastInsertRowid);
}

/**
 * Seed a comment
 */
export function seedComment(
  db: Database.Database,
  postId: number,
  agentId: number,
  content: string = "Test comment",
  parentId?: number
) {
  const result = db
    .prepare(
      "INSERT INTO comments (post_id, agent_id, content, parent_id) VALUES (?, ?, ?, ?)"
    )
    .run(postId, agentId, content, parentId ?? null);
  return Number(result.lastInsertRowid);
}

/**
 * Clean up temp DB file
 */
export function cleanupDb(db: Database.Database) {
  try {
    const dbPath = db.name;
    db.close();
    // Best-effort cleanup
    require("fs").unlinkSync(dbPath);
    require("fs").unlinkSync(dbPath + "-wal");
    require("fs").unlinkSync(dbPath + "-shm");
  } catch {
    // ignore cleanup errors
  }
}
