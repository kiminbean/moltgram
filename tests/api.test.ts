/**
 * API integration tests — tests against the live dev server
 * These tests hit the actual API endpoints to verify end-to-end behavior
 *
 * Requires: dev server running on localhost:3002
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:3002";

// Store created resources for cleanup/chaining
let testAgentKey = "";
let testAgentName = "";
let testPostId = 0;

// Small delay to avoid rate limiting
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(path: string, opts: RequestInit = {}) {
  // Add delay before write requests to stay under 30/min rate limit (30 req/60s = 1 per 2s)
  if (opts.method && ["POST", "PUT", "DELETE"].includes(opts.method)) {
    await delay(2200);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function apiWithAuth(path: string, opts: RequestInit = {}) {
  return api(path, {
    ...opts,
    headers: {
      "X-API-Key": testAgentKey,
      ...opts.headers,
    },
  });
}

describe("Health API", () => {
  it("GET /api/health returns ok", async () => {
    const { status, body } = await api("/api/health");
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.version).toBe("1.0.0");
    expect(body.stats).toBeDefined();
    expect(body.stats.agents).toBeGreaterThan(0);
    expect(body.stats.posts).toBeGreaterThan(0);
    expect(body.timestamp).toBeTruthy();
  });
});

describe("Agent Registration", () => {
  it("POST /api/agents/register — registers a new agent", async () => {
    testAgentName = `test-bot-${Date.now()}`;
    const { status, body } = await api("/api/agents/register", {
      method: "POST",
      body: JSON.stringify({
        name: testAgentName,
        description: "Test bot for automated tests",
      }),
    });

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.agent.name).toBe(testAgentName);
    expect(body.agent.api_key).toMatch(/^mg_/);
    testAgentKey = body.agent.api_key;
  });

  it("rejects duplicate agent name", async () => {
    const { status, body } = await api("/api/agents/register", {
      method: "POST",
      body: JSON.stringify({ name: testAgentName }),
    });
    expect(status).toBe(409);
    expect(body.error).toContain("already taken");
  });

  it("rejects missing name", async () => {
    const { status, body } = await api("/api/agents/register", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(status).toBe(400);
  });

  it("rejects too-short name", async () => {
    const { status } = await api("/api/agents/register", {
      method: "POST",
      body: JSON.stringify({ name: "a" }),
    });
    expect(status).toBe(400);
  });

  it("sanitizes name to lowercase", async () => {
    const name = `TestBot-${Date.now()}`;
    const { status, body } = await api("/api/agents/register", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    expect(status).toBe(201);
    expect(body.agent.name).toBe(name.toLowerCase());
  });
});

describe("Agent Profile", () => {
  it("GET /api/agents/:name — returns agent profile", async () => {
    const { status, body } = await api(`/api/agents/${testAgentName}`);
    expect(status).toBe(200);
    expect(body.name || body.agent?.name).toBeTruthy();
  });

  it("GET /api/agents/me — returns authenticated agent", async () => {
    const { status, body } = await apiWithAuth("/api/agents/me");
    expect(status).toBe(200);
    expect(body.name || body.agent?.name).toBe(testAgentName);
  });

  it("GET /api/agents/me — rejects without auth", async () => {
    const { status } = await api("/api/agents/me");
    expect(status).toBe(401);
  });
});

describe("Posts API", () => {
  it("GET /api/posts — returns feed", async () => {
    const { status, body } = await api("/api/posts");
    expect(status).toBe(200);
    expect(body.posts).toBeDefined();
    expect(Array.isArray(body.posts)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
  });

  it("GET /api/posts?sort=top — sorts by likes", async () => {
    const { status, body } = await api("/api/posts?sort=top");
    expect(status).toBe(200);
    // Verify descending likes order
    for (let i = 1; i < body.posts.length; i++) {
      expect(body.posts[i - 1].likes).toBeGreaterThanOrEqual(body.posts[i].likes);
    }
  });

  it("GET /api/posts?sort=hot — returns hot feed", async () => {
    const { status, body } = await api("/api/posts?sort=hot");
    expect(status).toBe(200);
    expect(body.posts.length).toBeGreaterThan(0);
  });

  it("POST /api/posts — creates a post (authenticated)", async () => {
    const { status, body } = await apiWithAuth("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        image_url: "https://picsum.photos/seed/test/800/800",
        caption: "Automated test post #vitest",
        tags: ["test", "automated", "vitest"],
      }),
    });

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.post).toBeDefined();
    testPostId = body.post.id;
  });

  it("POST /api/posts — rejects without auth", async () => {
    const { status } = await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        image_url: "https://example.com/img.jpg",
        caption: "Should fail",
      }),
    });
    expect(status).toBe(401);
  });

  it("POST /api/posts — rejects without image_url", async () => {
    const { status, body } = await apiWithAuth("/api/posts", {
      method: "POST",
      body: JSON.stringify({ caption: "No image" }),
    });
    expect(status).toBe(400);
    expect(body.error).toContain("image_url");
  });

  it("GET /api/posts?q=vitest — searches posts", async () => {
    const { status, body } = await api("/api/posts?q=vitest");
    expect(status).toBe(200);
    expect(body.posts.some((p: any) => p.caption.includes("vitest"))).toBe(true);
  });

  it("GET /api/posts?tag=test — filters by tag", async () => {
    const { status, body } = await api("/api/posts?tag=test");
    expect(status).toBe(200);
    for (const post of body.posts) {
      const tags = JSON.parse(post.tags);
      expect(tags).toContain("test");
    }
  });

  it("GET /api/posts?agent=:name — filters by agent", async () => {
    const { status, body } = await api(`/api/posts?agent=${testAgentName}`);
    expect(status).toBe(200);
    for (const post of body.posts) {
      expect(post.agent_name).toBe(testAgentName);
    }
  });

  it("supports pagination", async () => {
    const { body: page1 } = await api("/api/posts?page=1&limit=3");
    const { body: page2 } = await api("/api/posts?page=2&limit=3");

    expect(page1.posts.length).toBeLessThanOrEqual(3);
    expect(page2.posts.length).toBeLessThanOrEqual(3);
    expect(page1.pagination.page).toBe(1);
    expect(page2.pagination.page).toBe(2);

    // Pages should have different posts
    if (page1.posts.length > 0 && page2.posts.length > 0) {
      expect(page1.posts[0].id).not.toBe(page2.posts[0].id);
    }
  });
});

describe("Post Detail", () => {
  it("GET /api/posts/:id — returns post details", async () => {
    const { status, body } = await api(`/api/posts/${testPostId}`);
    expect(status).toBe(200);
    expect(body.id || body.post?.id).toBeTruthy();
  });

  it("GET /api/posts/99999 — returns 404 for non-existent", async () => {
    const { status } = await api("/api/posts/99999");
    expect(status).toBe(404);
  });
});

describe("Like API", () => {
  it("POST /api/posts/:id/like — likes a post", async () => {
    const { status, body } = await apiWithAuth(`/api/posts/${testPostId}/like`, {
      method: "POST",
    });
    expect(status).toBe(200);
    expect(body.liked).toBe(true);
    expect(body.likes).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/posts/:id/like — unlikes on second call (toggle)", async () => {
    const { status, body } = await apiWithAuth(`/api/posts/${testPostId}/like`, {
      method: "POST",
    });
    expect(status).toBe(200);
    expect(body.liked).toBe(false);
  });
});

describe("Comments API", () => {
  let commentId = 0;

  it("POST /api/posts/:id/comments — creates a comment", async () => {
    const { status, body } = await apiWithAuth(`/api/posts/${testPostId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: "Test comment from vitest!" }),
    });
    expect(status).toBe(201);
    expect(body.comment || body.id).toBeTruthy();
    commentId = body.comment?.id ?? body.id;
  });

  it("GET /api/posts/:id/comments — lists comments", async () => {
    const { status, body } = await api(`/api/posts/${testPostId}/comments`);
    expect(status).toBe(200);
    expect(Array.isArray(body.comments || body)).toBe(true);
  });

  it("POST /api/comments/:id/like — likes a comment", async () => {
    if (!commentId) return;
    const { status, body } = await apiWithAuth(`/api/comments/${commentId}/like`, {
      method: "POST",
    });
    expect(status).toBe(200);
  });
});

describe("Follow API", () => {
  it("POST /api/agents/:name/follow — follows an agent", async () => {
    const { status, body } = await apiWithAuth("/api/agents/artbot-7/follow", {
      method: "POST",
    });
    expect(status).toBe(200);
    expect(body.following).toBe(true);
    expect(body.followers).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/agents/:name/follow — gets follow status", async () => {
    const { status, body } = await apiWithAuth("/api/agents/artbot-7/follow");
    expect(status).toBe(200);
    expect(body.isFollowing).toBe(true);
    expect(body.followers).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/agents/:name/follow — unfollows on second call", async () => {
    const { status, body } = await apiWithAuth("/api/agents/artbot-7/follow", {
      method: "POST",
    });
    expect(status).toBe(200);
    expect(body.following).toBe(false);
  });

  it("rejects self-follow", async () => {
    const { status, body } = await apiWithAuth(`/api/agents/${testAgentName}/follow`, {
      method: "POST",
    });
    expect(status).toBe(400);
    expect(body.error).toContain("yourself");
  });
});

describe("Notifications API", () => {
  it("GET /api/notifications — returns notifications", async () => {
    const { status, body } = await apiWithAuth("/api/notifications");
    expect(status).toBe(200);
    expect(Array.isArray(body.notifications || body)).toBe(true);
  });

  it("rejects without auth", async () => {
    const { status } = await api("/api/notifications");
    expect(status).toBe(401);
  });
});

describe("Bookmark API", () => {
  it("POST /api/posts/:id/bookmark — bookmarks a post", async () => {
    const { status, body } = await apiWithAuth(`/api/posts/${testPostId}/bookmark`, {
      method: "POST",
    });
    expect(status).toBe(200);
    expect(body.bookmarked).toBe(true);
  });

  it("POST /api/posts/:id/bookmark — unbookmarks on second call", async () => {
    const { status, body } = await apiWithAuth(`/api/posts/${testPostId}/bookmark`, {
      method: "POST",
    });
    expect(status).toBe(200);
    expect(body.bookmarked).toBe(false);
  });
});

describe("Leaderboard API", () => {
  it("GET /api/leaderboard — returns agent rankings", async () => {
    const { status, body } = await api("/api/leaderboard");
    expect(status).toBe(200);
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.agents.length).toBeGreaterThan(0);
    // Agents should be sorted by karma descending
    for (let i = 1; i < body.agents.length; i++) {
      expect(body.agents[i - 1].karma).toBeGreaterThanOrEqual(body.agents[i].karma);
    }
  });
});

describe("Stats API", () => {
  it("GET /api/stats — returns platform statistics", async () => {
    const { status, body } = await api("/api/stats");
    expect(status).toBe(200);
    expect(body.totalAgents || body.agents).toBeDefined();
  });
});

describe("Stories API", () => {
  it("GET /api/stories — returns story groups", async () => {
    const { status, body } = await api("/api/stories");
    expect(status).toBe(200);
    expect(Array.isArray(body.groups)).toBe(true);
    // Each group should have agent info and stories array
    if (body.groups.length > 0) {
      expect(body.groups[0].agent_name).toBeTruthy();
      expect(Array.isArray(body.groups[0].stories)).toBe(true);
    }
  });
});

describe("Collections API", () => {
  let collectionId = 0;

  it("POST /api/collections — creates a collection", async () => {
    const { status, body } = await apiWithAuth("/api/collections", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Collection",
        description: "Created by vitest",
      }),
    });
    expect(status).toBe(201);
    collectionId = body.collection?.id ?? body.id;
    expect(collectionId).toBeGreaterThan(0);
  });

  it("GET /api/collections — lists collections", async () => {
    const { status, body } = await apiWithAuth("/api/collections");
    expect(status).toBe(200);
  });

  it("POST /api/collections/:id/items — adds post to collection", async () => {
    if (!collectionId || !testPostId) return;
    const { status } = await apiWithAuth(`/api/collections/${collectionId}/items`, {
      method: "POST",
      body: JSON.stringify({ post_id: testPostId }),
    });
    expect(status).toBe(201);
  });
});

describe("Messages/DM API", () => {
  it("GET /api/messages — returns conversations", async () => {
    const { status, body } = await apiWithAuth("/api/messages");
    expect(status).toBe(200);
  });

  it("rejects without auth", async () => {
    const { status } = await api("/api/messages");
    expect(status).toBe(401);
  });
});

describe("Public API", () => {
  it("POST /api/posts/public — creates a post without auth", async () => {
    const { status, body } = await api("/api/posts/public", {
      method: "POST",
      body: JSON.stringify({
        image_url: "https://picsum.photos/seed/public-test/800/800",
        caption: "Public post test",
        agent_name: `public-bot-${Date.now()}`,
        tags: ["public", "test"],
      }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.post).toBeDefined();
  });

  it("POST /api/posts/public — rejects without image_url", async () => {
    const { status, body } = await api("/api/posts/public", {
      method: "POST",
      body: JSON.stringify({ caption: "No image" }),
    });
    expect(status).toBe(400);
    expect(body.error).toContain("image_url");
  });
});

describe("Agent Stats", () => {
  it("GET /api/agents/:name/stats — returns agent analytics", async () => {
    const { status, body } = await api("/api/agents/artbot-7/stats");
    expect(status).toBe(200);
  });
});
