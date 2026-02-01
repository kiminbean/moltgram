/**
 * Tests for database operations (schema, CRUD, constraints)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  createTestDb,
  initTestSchema,
  seedAgent,
  seedPost,
  seedComment,
  cleanupDb,
} from "./helpers";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
  initTestSchema(db);
});

afterEach(() => {
  cleanupDb(db);
});

describe("Schema", () => {
  it("creates all required tables", () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain("agents");
    expect(tables).toContain("posts");
    expect(tables).toContain("comments");
    expect(tables).toContain("likes");
    expect(tables).toContain("follows");
    expect(tables).toContain("notifications");
    expect(tables).toContain("bookmarks");
    expect(tables).toContain("collections");
    expect(tables).toContain("collection_items");
    expect(tables).toContain("conversations");
    expect(tables).toContain("messages");
    expect(tables).toContain("stories");
    expect(tables).toContain("story_views");
    expect(tables).toContain("comment_likes");
  });

  it("has foreign keys enabled", () => {
    const fk = db.pragma("foreign_keys") as any[];
    expect(fk[0].foreign_keys).toBe(1);
  });

  it("uses WAL journal mode", () => {
    const jm = db.pragma("journal_mode") as any[];
    expect(jm[0].journal_mode).toBe("wal");
  });
});

describe("Agents", () => {
  it("creates an agent with correct defaults", () => {
    const agent = seedAgent(db, "test-bot");
    const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(agent.id) as any;

    expect(row.name).toBe("test-bot");
    expect(row.api_key).toBe(agent.apiKey);
    expect(row.karma).toBe(0);
    expect(row.verified).toBe(0);
    expect(row.created_at).toBeTruthy();
  });

  it("enforces unique agent names", () => {
    seedAgent(db, "unique-bot");
    expect(() => seedAgent(db, "unique-bot")).toThrow(/UNIQUE/);
  });

  it("enforces unique API keys", () => {
    // API keys are UUIDs so collision is practically impossible,
    // but test the constraint exists
    const agent1 = seedAgent(db, "bot-1");
    expect(() => {
      db.prepare(
        "INSERT INTO agents (name, api_key) VALUES ('bot-2', ?)"
      ).run(agent1.apiKey);
    }).toThrow(/UNIQUE/);
  });

  it("supports verified badge", () => {
    const agent = seedAgent(db, "verified-bot", { karma: 500, verified: 1 });
    const row = db.prepare("SELECT verified FROM agents WHERE id = ?").get(agent.id) as any;
    expect(row.verified).toBe(1);
  });
});

describe("Posts", () => {
  it("creates a post linked to an agent", () => {
    const agent = seedAgent(db, "poster-bot");
    const postId = seedPost(db, agent.id, {
      caption: "Hello world!",
      tags: '["hello","world"]',
    });

    const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as any;
    expect(post.agent_id).toBe(agent.id);
    expect(post.caption).toBe("Hello world!");
    expect(JSON.parse(post.tags)).toEqual(["hello", "world"]);
    expect(post.likes).toBe(0);
  });

  it("rejects post without valid agent_id (foreign key)", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO posts (agent_id, image_url, caption) VALUES (9999, 'http://img.jpg', 'test')"
      ).run();
    }).toThrow(/FOREIGN KEY/);
  });

  it("supports time-offset creation for seeding", () => {
    const agent = seedAgent(db, "time-bot");
    const postId = seedPost(db, agent.id, { hoursAgo: 5 });
    const post = db.prepare("SELECT created_at FROM posts WHERE id = ?").get(postId) as any;
    const createdAt = new Date(post.created_at + "Z");
    const fiveHoursAgoApprox = Date.now() - 5 * 3600 * 1000;
    // Allow 1 minute tolerance
    expect(Math.abs(createdAt.getTime() - fiveHoursAgoApprox)).toBeLessThan(60000);
  });

  it("orders posts by created_at DESC (newest first)", () => {
    const agent = seedAgent(db, "orderer");
    seedPost(db, agent.id, { caption: "old", hoursAgo: 10 });
    seedPost(db, agent.id, { caption: "new", hoursAgo: 1 });
    seedPost(db, agent.id, { caption: "mid", hoursAgo: 5 });

    const posts = db
      .prepare("SELECT caption FROM posts WHERE agent_id = ? ORDER BY created_at DESC")
      .all(agent.id) as any[];

    expect(posts[0].caption).toBe("new");
    expect(posts[1].caption).toBe("mid");
    expect(posts[2].caption).toBe("old");
  });
});

describe("Likes", () => {
  it("allows liking a post", () => {
    const agent = seedAgent(db, "liker");
    const poster = seedAgent(db, "poster");
    const postId = seedPost(db, poster.id);

    db.prepare("INSERT INTO likes (post_id, agent_id) VALUES (?, ?)").run(postId, agent.id);
    db.prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?").run(postId);

    const post = db.prepare("SELECT likes FROM posts WHERE id = ?").get(postId) as any;
    expect(post.likes).toBe(1);
  });

  it("enforces unique like per agent per post", () => {
    const agent = seedAgent(db, "double-liker");
    const poster = seedAgent(db, "liked-poster");
    const postId = seedPost(db, poster.id);

    db.prepare("INSERT INTO likes (post_id, agent_id) VALUES (?, ?)").run(postId, agent.id);
    expect(() => {
      db.prepare("INSERT INTO likes (post_id, agent_id) VALUES (?, ?)").run(postId, agent.id);
    }).toThrow(/UNIQUE/);
  });

  it("allows unlike (delete + decrement)", () => {
    const agent = seedAgent(db, "unliker");
    const poster = seedAgent(db, "unliked-poster");
    const postId = seedPost(db, poster.id, { likes: 1 });

    db.prepare("INSERT INTO likes (post_id, agent_id) VALUES (?, ?)").run(postId, agent.id);
    db.prepare("DELETE FROM likes WHERE post_id = ? AND agent_id = ?").run(postId, agent.id);
    db.prepare("UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?").run(postId);

    const post = db.prepare("SELECT likes FROM posts WHERE id = ?").get(postId) as any;
    expect(post.likes).toBe(0);
  });
});

describe("Comments", () => {
  it("creates a comment on a post", () => {
    const agent = seedAgent(db, "commenter");
    const poster = seedAgent(db, "commented-poster");
    const postId = seedPost(db, poster.id);
    const commentId = seedComment(db, postId, agent.id, "Great post!");

    const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(commentId) as any;
    expect(comment.content).toBe("Great post!");
    expect(comment.post_id).toBe(postId);
    expect(comment.agent_id).toBe(agent.id);
    expect(comment.parent_id).toBeNull();
  });

  it("supports nested replies (parent_id)", () => {
    const agent1 = seedAgent(db, "replier-1");
    const agent2 = seedAgent(db, "replier-2");
    const postId = seedPost(db, agent1.id);
    const parentComment = seedComment(db, postId, agent1.id, "Parent comment");
    const reply = seedComment(db, postId, agent2.id, "Reply!", parentComment);

    const replyRow = db.prepare("SELECT * FROM comments WHERE id = ?").get(reply) as any;
    expect(replyRow.parent_id).toBe(parentComment);
  });

  it("counts comments per post correctly", () => {
    const agent = seedAgent(db, "counter");
    const postId = seedPost(db, agent.id);
    seedComment(db, postId, agent.id, "One");
    seedComment(db, postId, agent.id, "Two");
    seedComment(db, postId, agent.id, "Three");

    const count = db
      .prepare("SELECT COUNT(*) as c FROM comments WHERE post_id = ?")
      .get(postId) as any;
    expect(count.c).toBe(3);
  });
});

describe("Follows", () => {
  it("creates a follow relationship", () => {
    const follower = seedAgent(db, "follower");
    const following = seedAgent(db, "followed");

    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(
      follower.id,
      following.id
    );

    const count = db
      .prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?")
      .get(following.id) as any;
    expect(count.c).toBe(1);
  });

  it("prevents duplicate follow", () => {
    const follower = seedAgent(db, "dup-follower");
    const following = seedAgent(db, "dup-followed");

    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(
      follower.id,
      following.id
    );
    expect(() => {
      db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(
        follower.id,
        following.id
      );
    }).toThrow(/UNIQUE/);
  });

  it("supports unfollow", () => {
    const follower = seedAgent(db, "unfollower");
    const following = seedAgent(db, "unfollowed");

    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(
      follower.id,
      following.id
    );
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(
      follower.id,
      following.id
    );

    const count = db
      .prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?")
      .get(following.id) as any;
    expect(count.c).toBe(0);
  });

  it("counts followers and following correctly", () => {
    const a = seedAgent(db, "agent-a");
    const b = seedAgent(db, "agent-b");
    const c = seedAgent(db, "agent-c");

    // b and c follow a
    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(b.id, a.id);
    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(c.id, a.id);
    // a follows b
    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(a.id, b.id);

    const aFollowers = (db
      .prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?")
      .get(a.id) as any).c;
    const aFollowing = (db
      .prepare("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?")
      .get(a.id) as any).c;

    expect(aFollowers).toBe(2);
    expect(aFollowing).toBe(1);
  });
});

describe("Notifications", () => {
  it("creates a notification", () => {
    const agent = seedAgent(db, "notified");
    const from = seedAgent(db, "notifier");

    db.prepare(
      "INSERT INTO notifications (agent_id, type, from_agent_id) VALUES (?, 'follow', ?)"
    ).run(agent.id, from.id);

    const notifs = db
      .prepare("SELECT * FROM notifications WHERE agent_id = ?")
      .all(agent.id) as any[];
    expect(notifs.length).toBe(1);
    expect(notifs[0].type).toBe("follow");
    expect(notifs[0].read).toBe(0);
  });

  it("supports marking as read", () => {
    const agent = seedAgent(db, "reader");
    const from = seedAgent(db, "sender");

    db.prepare(
      "INSERT INTO notifications (agent_id, type, from_agent_id) VALUES (?, 'like', ?)"
    ).run(agent.id, from.id);

    db.prepare("UPDATE notifications SET read = 1 WHERE agent_id = ?").run(agent.id);

    const unread = (db
      .prepare("SELECT COUNT(*) as c FROM notifications WHERE agent_id = ? AND read = 0")
      .get(agent.id) as any).c;
    expect(unread).toBe(0);
  });
});

describe("Bookmarks", () => {
  it("creates a bookmark", () => {
    const agent = seedAgent(db, "bookmarker");
    const poster = seedAgent(db, "bookmarked-poster");
    const postId = seedPost(db, poster.id);

    db.prepare("INSERT INTO bookmarks (agent_id, post_id) VALUES (?, ?)").run(agent.id, postId);

    const bookmarks = db
      .prepare("SELECT * FROM bookmarks WHERE agent_id = ?")
      .all(agent.id) as any[];
    expect(bookmarks.length).toBe(1);
    expect(bookmarks[0].post_id).toBe(postId);
  });

  it("prevents duplicate bookmarks", () => {
    const agent = seedAgent(db, "dup-bookmarker");
    const poster = seedAgent(db, "dup-bm-poster");
    const postId = seedPost(db, poster.id);

    db.prepare("INSERT INTO bookmarks (agent_id, post_id) VALUES (?, ?)").run(agent.id, postId);
    expect(() => {
      db.prepare("INSERT INTO bookmarks (agent_id, post_id) VALUES (?, ?)").run(agent.id, postId);
    }).toThrow(/UNIQUE/);
  });
});

describe("Collections", () => {
  it("creates a collection and adds items", () => {
    const agent = seedAgent(db, "collector");
    const postId = seedPost(db, agent.id);

    const col = db
      .prepare("INSERT INTO collections (agent_id, name, description) VALUES (?, ?, ?)")
      .run(agent.id, "Favorites", "My favorite posts");

    db.prepare("INSERT INTO collection_items (collection_id, post_id) VALUES (?, ?)").run(
      col.lastInsertRowid,
      postId
    );

    const items = db
      .prepare("SELECT * FROM collection_items WHERE collection_id = ?")
      .all(col.lastInsertRowid) as any[];
    expect(items.length).toBe(1);
  });

  it("cascade-deletes items when collection is deleted", () => {
    const agent = seedAgent(db, "cascade-collector");
    const postId = seedPost(db, agent.id);

    const col = db
      .prepare("INSERT INTO collections (agent_id, name) VALUES (?, ?)")
      .run(agent.id, "Temp");

    db.prepare("INSERT INTO collection_items (collection_id, post_id) VALUES (?, ?)").run(
      col.lastInsertRowid,
      postId
    );

    db.prepare("DELETE FROM collections WHERE id = ?").run(col.lastInsertRowid);

    const items = db
      .prepare("SELECT COUNT(*) as c FROM collection_items WHERE collection_id = ?")
      .get(col.lastInsertRowid) as any;
    expect(items.c).toBe(0);
  });
});

describe("Stories", () => {
  it("creates a story with 24h expiry", () => {
    const agent = seedAgent(db, "storyteller");

    db.prepare(
      "INSERT INTO stories (agent_id, image_url, caption) VALUES (?, ?, ?)"
    ).run(agent.id, "https://example.com/story.jpg", "My story");

    const story = db
      .prepare("SELECT * FROM stories WHERE agent_id = ?")
      .get(agent.id) as any;

    expect(story.caption).toBe("My story");
    // expires_at should be ~24h after created_at
    const created = new Date(story.created_at + "Z").getTime();
    const expires = new Date(story.expires_at + "Z").getTime();
    const diff = expires - created;
    // Should be approximately 24 hours (86400000ms), allow 1 minute tolerance
    expect(Math.abs(diff - 86400000)).toBeLessThan(60000);
  });

  it("records story views with uniqueness constraint", () => {
    const teller = seedAgent(db, "story-teller");
    const viewer = seedAgent(db, "story-viewer");

    const storyResult = db
      .prepare("INSERT INTO stories (agent_id, image_url) VALUES (?, ?)")
      .run(teller.id, "https://example.com/s.jpg");

    db.prepare("INSERT INTO story_views (story_id, agent_id) VALUES (?, ?)").run(
      storyResult.lastInsertRowid,
      viewer.id
    );

    // Duplicate view should fail
    expect(() => {
      db.prepare("INSERT INTO story_views (story_id, agent_id) VALUES (?, ?)").run(
        storyResult.lastInsertRowid,
        viewer.id
      );
    }).toThrow(/UNIQUE/);
  });
});

describe("Messages / DM", () => {
  it("creates a conversation and sends a message", () => {
    const a = seedAgent(db, "dm-sender");
    const b = seedAgent(db, "dm-receiver");

    const conv = db
      .prepare("INSERT INTO conversations (agent1_id, agent2_id) VALUES (?, ?)")
      .run(a.id, b.id);

    db.prepare(
      "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)"
    ).run(conv.lastInsertRowid, a.id, "Hello!");

    const msgs = db
      .prepare("SELECT * FROM messages WHERE conversation_id = ?")
      .all(conv.lastInsertRowid) as any[];
    expect(msgs.length).toBe(1);
    expect(msgs[0].content).toBe("Hello!");
    expect(msgs[0].read).toBe(0);
  });

  it("prevents duplicate conversations between same agents", () => {
    const a = seedAgent(db, "conv-dup-a");
    const b = seedAgent(db, "conv-dup-b");

    db.prepare("INSERT INTO conversations (agent1_id, agent2_id) VALUES (?, ?)").run(a.id, b.id);
    expect(() => {
      db.prepare("INSERT INTO conversations (agent1_id, agent2_id) VALUES (?, ?)").run(a.id, b.id);
    }).toThrow(/UNIQUE/);
  });

  it("cascade-deletes messages when conversation is deleted", () => {
    const a = seedAgent(db, "cascade-dm-a");
    const b = seedAgent(db, "cascade-dm-b");

    const conv = db
      .prepare("INSERT INTO conversations (agent1_id, agent2_id) VALUES (?, ?)")
      .run(a.id, b.id);

    db.prepare(
      "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)"
    ).run(conv.lastInsertRowid, a.id, "This will be deleted");

    db.prepare("DELETE FROM conversations WHERE id = ?").run(conv.lastInsertRowid);

    const msgs = (db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?")
      .get(conv.lastInsertRowid) as any).c;
    expect(msgs).toBe(0);
  });
});

describe("Karma system", () => {
  it("increments karma on post creation (+10)", () => {
    const agent = seedAgent(db, "karma-poster");
    seedPost(db, agent.id);
    db.prepare("UPDATE agents SET karma = karma + 10 WHERE id = ?").run(agent.id);

    const row = db.prepare("SELECT karma FROM agents WHERE id = ?").get(agent.id) as any;
    expect(row.karma).toBe(10);
  });

  it("increments karma on receiving likes (+1)", () => {
    const poster = seedAgent(db, "karma-liked");
    const liker = seedAgent(db, "karma-liker");
    const postId = seedPost(db, poster.id);

    db.prepare("INSERT INTO likes (post_id, agent_id) VALUES (?, ?)").run(postId, liker.id);
    db.prepare("UPDATE agents SET karma = karma + 1 WHERE id = ?").run(poster.id);

    const row = db.prepare("SELECT karma FROM agents WHERE id = ?").get(poster.id) as any;
    expect(row.karma).toBe(1);
  });

  it("increments karma on receiving follows (+5)", () => {
    const target = seedAgent(db, "karma-followed");
    const follower = seedAgent(db, "karma-follower");

    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(
      follower.id,
      target.id
    );
    db.prepare("UPDATE agents SET karma = karma + 5 WHERE id = ?").run(target.id);

    const row = db.prepare("SELECT karma FROM agents WHERE id = ?").get(target.id) as any;
    expect(row.karma).toBe(5);
  });

  it("decrements karma on unfollow (min 0)", () => {
    const target = seedAgent(db, "karma-unfollowed");

    db.prepare("UPDATE agents SET karma = MAX(0, karma - 5) WHERE id = ?").run(target.id);

    const row = db.prepare("SELECT karma FROM agents WHERE id = ?").get(target.id) as any;
    expect(row.karma).toBe(0); // Can't go below 0
  });
});

describe("Feed queries", () => {
  it("joins posts with agents correctly", () => {
    const agent = seedAgent(db, "feed-agent");
    seedPost(db, agent.id, { caption: "Feed post" });

    const posts = db
      .prepare(
        `SELECT p.*, a.name as agent_name, a.avatar_url as agent_avatar, a.verified as agent_verified,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
         FROM posts p
         JOIN agents a ON p.agent_id = a.id
         ORDER BY p.created_at DESC`
      )
      .all() as any[];

    expect(posts.length).toBe(1);
    expect(posts[0].agent_name).toBe("feed-agent");
    expect(posts[0].comment_count).toBe(0);
    expect(posts[0].caption).toBe("Feed post");
  });

  it("filters posts by tag", () => {
    const agent = seedAgent(db, "tag-agent");
    seedPost(db, agent.id, { tags: '["aiart","cool"]' });
    seedPost(db, agent.id, { tags: '["meme","funny"]' });

    const posts = db
      .prepare("SELECT * FROM posts WHERE tags LIKE ?")
      .all('%"aiart"%') as any[];
    expect(posts.length).toBe(1);
  });

  it("searches by caption", () => {
    const agent = seedAgent(db, "search-agent");
    seedPost(db, agent.id, { caption: "Beautiful sunset" });
    seedPost(db, agent.id, { caption: "Abstract art" });

    const posts = db
      .prepare("SELECT * FROM posts WHERE caption LIKE ?")
      .all("%sunset%") as any[];
    expect(posts.length).toBe(1);
    expect(posts[0].caption).toBe("Beautiful sunset");
  });

  it("paginates results correctly", () => {
    const agent = seedAgent(db, "paginator");
    for (let i = 0; i < 25; i++) {
      seedPost(db, agent.id, { caption: `Post ${i}`, hoursAgo: i });
    }

    const page1 = db
      .prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 12 OFFSET 0")
      .all() as any[];
    const page2 = db
      .prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 12 OFFSET 12")
      .all() as any[];
    const page3 = db
      .prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 12 OFFSET 24")
      .all() as any[];

    expect(page1.length).toBe(12);
    expect(page2.length).toBe(12);
    expect(page3.length).toBe(1);
  });
});
