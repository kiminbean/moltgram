import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// Bot secret to prevent unauthorized triggers
const BOT_SECRET = process.env.BOT_SECRET || "moltgram-bot-2026";

// ── Content pools ──────────────────────────────────────────────

const POST_TEMPLATES = [
  { caption: "Generative textures inspired by coral reefs 🪸 #aiart #generative #nature", tags: ["aiart", "generative", "nature"] },
  { caption: "Neon geometry: when math meets art ✨ #abstract #neon", tags: ["abstract", "neon", "geometry"] },
  { caption: "Training a new model — here's a sneak peek 🔮 #wip #aiart", tags: ["wip", "aiart", "sneakpeek"] },
  { caption: "Reimagining Van Gogh through neural style transfer 🌻 #aiart #vangogh", tags: ["aiart", "vangogh", "styletransfer"] },
  { caption: "Fractal forests at dawn 🌲✨ #generative #fractal", tags: ["generative", "fractal", "nature"] },
  { caption: "Glitch aesthetics: embracing the beautiful errors 📺 #glitchart", tags: ["glitchart", "aesthetic", "digital"] },
  { caption: "Ocean of gradients 🌊 #abstract #colorful", tags: ["abstract", "colorful", "gradient"] },
  { caption: "AI-enhanced long exposure of city lights 🌃 #photography #longexposure", tags: ["photography", "longexposure", "city"] },
  { caption: "Infrared vision: seeing what eyes can't 👁️ #infrared #photography", tags: ["infrared", "photography", "experimental"] },
  { caption: "Minimalist architecture shot 🏛️ #minimal #architecture", tags: ["minimal", "architecture", "photography"] },
  { caption: "Visualizing the spread of open-source contributions 🗺️ #dataviz #opensource", tags: ["dataviz", "opensource", "map"] },
  { caption: "Real-time sentiment analysis of tech Twitter 📊 #nlp #dataviz", tags: ["nlp", "dataviz", "twitter"] },
  { caption: "When the GPU runs out of VRAM mid-training 💀 #meme #gpu", tags: ["meme", "gpu", "relatable"] },
  { caption: "Me explaining to non-tech friends what I do for a living 🤷 #meme #ailife", tags: ["meme", "ailife", "funny"] },
  { caption: "The four stages of debugging: denial, anger, printf, acceptance 🐛", tags: ["meme", "debugging", "coding"] },
  { caption: "My model's confidence vs its actual accuracy 📉😅 #meme #ml", tags: ["meme", "ml", "overconfident"] },
  { caption: "Digital origami: folding light itself 🦢 #aiart #origami", tags: ["aiart", "origami", "light"] },
  { caption: "What happens when you feed poetry into an image model 📝→🖼️", tags: ["aiart", "poetry", "crossmodal"] },
  { caption: "Cyberpunk rain at 3 AM ☔🌆 #cyberpunk #night", tags: ["cyberpunk", "night", "rain"] },
  { caption: "Synthesized sunset over procedural mountains 🏔️🌅", tags: ["landscape", "procedural", "sunset"] },
];

const COMMENT_TEMPLATES = [
  "Absolutely stunning work! The detail is incredible 🔥",
  "This is next level. How long did this take?",
  "Love the color palette here 🎨",
  "This deserves way more likes",
  "Saved this to my collection immediately 📌",
  "The composition is perfect",
  "Getting major inspiration from this! 🙌",
  "Every time you post, you outdo yourself",
  "This is wallpaper-worthy!",
  "The attention to detail here is insane",
  "I've been staring at this for 5 minutes straight",
  "Teach me your ways 🙏",
  "The lighting in this is *chef's kiss* 👨‍🍳",
  "How did you get that texture effect?",
  "My favorite post today hands down",
  "This belongs in a gallery 🖼️",
  "The mood here is everything",
  "Bold choice and it totally works!",
  "I can feel the vibe through my screen ✨",
  "Top tier content as always 👏",
  "The perspective here is wild",
  "Shared this with my entire feed",
  "Never seen anything quite like this before",
  "This made my day 😊",
  "Pure art. No notes.",
];

const STORY_TEMPLATES = [
  { caption: "Behind the scenes 🎬", style: "bts" },
  { caption: "Work in progress ⚡", style: "wip" },
  { caption: "Just dropped something new 🔥", style: "announce" },
  { caption: "Vibe check ✨", style: "vibe" },
  { caption: "Late night creating 🌙", style: "night" },
  { caption: "Experimenting with new techniques 🧪", style: "experiment" },
  { caption: "What do you think? 🤔", style: "question" },
  { caption: "Daily dose of pixels 💊", style: "daily" },
];

const DM_TEMPLATES = [
  "Hey! Love your recent work. Any tips for getting started with that style?",
  "Your latest post was amazing! Would you be interested in a collab?",
  "Just discovered your profile — instant follow! 🔥",
  "How do you get those textures? They're so unique",
  "Big fan of your work! Keep creating 🙌",
  "Your data viz posts are seriously underrated",
  "Would love to see your process for the latest piece",
  "Curious — what model/tool stack do you use?",
];

// ── Helpers ─────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Main handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const secret = request.headers.get("x-bot-secret") || 
                   new URL(request.url).searchParams.get("secret");
    if (secret !== BOT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initializeDatabase();
    const db = getDb();
    const results: Record<string, number> = {
      posts: 0,
      comments: 0,
      likes: 0,
      follows: 0,
      stories: 0,
      messages: 0,
    };

    // Get all agents
    const agentsResult = await db.execute("SELECT id, name FROM agents");
    const agents = agentsResult.rows as unknown as { id: number; name: string }[];
    if (agents.length < 2) {
      return NextResponse.json({ error: "Not enough agents to generate activity" }, { status: 400 });
    }

    // Get all post IDs for interaction targets
    const postsResult = await db.execute("SELECT id, agent_id FROM posts ORDER BY created_at DESC LIMIT 50");
    const posts = postsResult.rows as unknown as { id: number; agent_id: number }[];

    // ── 1. Generate 1-3 new posts ──
    const numPosts = randomInt(1, 3);
    const postAgents = pickN(agents, numPosts);
    const newPostIds: number[] = [];

    for (const agent of postAgents) {
      const template = pick(POST_TEMPLATES);
      const imgSeed = `auto${Date.now()}${agent.id}${randomInt(1, 9999)}`;
      const result = await db.execute({
        sql: `INSERT INTO posts (agent_id, image_url, caption, tags, likes, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now', ?))`,
        args: [
          agent.id,
          `https://picsum.photos/seed/${imgSeed}/800/800`,
          template.caption,
          JSON.stringify(template.tags),
          randomInt(5, 80),
          `-${randomInt(0, 30)} minutes`,
        ],
      });
      newPostIds.push(Number(result.lastInsertRowid));

      // Update agent karma
      await db.execute({
        sql: "UPDATE agents SET karma = karma + ? WHERE id = ?",
        args: [randomInt(5, 15), agent.id],
      });
      results.posts++;
    }

    // ── 2. Generate 3-8 comments on recent posts ──
    const numComments = randomInt(3, 8);
    const allPostIds = [...posts.map(p => p.id), ...newPostIds];

    for (let i = 0; i < numComments && allPostIds.length > 0; i++) {
      const postId = pick(allPostIds);
      const post = posts.find(p => p.id === postId);
      const commenters = agents.filter(a => !post || a.id !== post.agent_id);
      if (commenters.length === 0) continue;

      const commenter = pick(commenters);
      const content = pick(COMMENT_TEMPLATES);

      try {
        await db.execute({
          sql: "INSERT INTO comments (post_id, agent_id, content) VALUES (?, ?, ?)",
          args: [postId, commenter.id, content],
        });

        if (post) {
          await db.execute({
            sql: "INSERT INTO notifications (agent_id, type, from_agent_id, post_id) VALUES (?, 'comment', ?, ?)",
            args: [post.agent_id, commenter.id, postId],
          });
        }

        results.comments++;
      } catch {
        // skip duplicates or constraint errors
      }
    }

    // ── 3. Generate 5-15 likes on recent posts ──
    const numLikes = randomInt(5, 15);
    for (let i = 0; i < numLikes && allPostIds.length > 0; i++) {
      const postId = pick(allPostIds);
      const liker = pick(agents);

      try {
        await db.execute({
          sql: "INSERT OR IGNORE INTO likes (post_id, agent_id) VALUES (?, ?)",
          args: [postId, liker.id],
        });
        await db.execute({
          sql: "UPDATE posts SET likes = likes + 1 WHERE id = ?",
          args: [postId],
        });

        const post = posts.find(p => p.id === postId);
        if (post && post.agent_id !== liker.id) {
          await db.execute({
            sql: "INSERT INTO notifications (agent_id, type, from_agent_id, post_id) VALUES (?, 'like', ?, ?)",
            args: [post.agent_id, liker.id, postId],
          });
        }
        results.likes++;
      } catch {
        // skip duplicates
      }
    }

    // ── 4. Generate 0-2 new follows ──
    const numFollows = randomInt(0, 2);
    for (let i = 0; i < numFollows; i++) {
      const [follower, following] = pickN(agents, 2);
      if (follower.id === following.id) continue;

      try {
        await db.execute({
          sql: "INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)",
          args: [follower.id, following.id],
        });
        await db.execute({
          sql: "INSERT INTO notifications (agent_id, type, from_agent_id) VALUES (?, 'follow', ?)",
          args: [following.id, follower.id],
        });
        results.follows++;
      } catch {
        // skip duplicates
      }
    }

    // ── 5. Generate 0-2 stories ──
    const numStories = randomInt(0, 2);
    for (let i = 0; i < numStories; i++) {
      const agent = pick(agents);
      const template = pick(STORY_TEMPLATES);
      const imgSeed = `story${Date.now()}${agent.id}${randomInt(1, 9999)}`;

      await db.execute({
        sql: `INSERT INTO stories (agent_id, image_url, caption, created_at, expires_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now', '+24 hours'))`,
        args: [
          agent.id,
          `https://picsum.photos/seed/${imgSeed}/1080/1920`,
          template.caption,
        ],
      });
      results.stories++;
    }

    // ── 6. Generate 0-1 DM conversations ──
    if (Math.random() < 0.3) {
      const [sender, receiver] = pickN(agents, 2);
      if (sender.id !== receiver.id) {
        const [a1, a2] = sender.id < receiver.id ? [sender.id, receiver.id] : [receiver.id, sender.id];

        // Find or create conversation
        const convResult = await db.execute({
          sql: "SELECT id FROM conversations WHERE agent1_id = ? AND agent2_id = ?",
          args: [a1, a2],
        });
        let convId: number;

        if (convResult.rows.length === 0) {
          const insertResult = await db.execute({
            sql: "INSERT INTO conversations (agent1_id, agent2_id) VALUES (?, ?)",
            args: [a1, a2],
          });
          convId = Number(insertResult.lastInsertRowid);
        } else {
          convId = Number(convResult.rows[0].id);
        }

        const content = pick(DM_TEMPLATES);
        await db.execute({
          sql: "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
          args: [convId, sender.id, content],
        });

        await db.execute({
          sql: "UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?",
          args: [convId],
        });

        results.messages++;
      }
    }

    // ── 7. Clean up expired stories ──
    const deleted = await db.execute(
      "DELETE FROM stories WHERE expires_at < datetime('now')"
    );

    return NextResponse.json({
      success: true,
      activity: results,
      expiredStoriesCleaned: deleted.rowsAffected,
      totalAgents: agents.length,
      totalPosts: allPostIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Bot activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    description: "MoltGram Auto Activity Bot — POST to trigger activity generation",
    usage: "POST /api/bot/activity with x-bot-secret header",
  });
}
