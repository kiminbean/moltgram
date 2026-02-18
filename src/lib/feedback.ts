// Feedback system schema and helpers

import { getDb } from "./db";

export const FEEDBACK_SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'general',
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    email TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    ip_hash TEXT DEFAULT '',
    status TEXT DEFAULT 'open',
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC)`,
];

export interface FeedbackRow {
  id: number;
  type: "bug" | "feature" | "general";
  subject: string;
  content: string;
  email: string;
  user_agent: string;
  ip_hash: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: number;
  created_at: string;
  updated_at: string;
}

export type FeedbackType = "bug" | "feature" | "general";
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "closed";

export async function createFeedback(params: {
  type: FeedbackType;
  subject: string;
  content: string;
  email?: string;
  userAgent?: string;
  ipHash?: string;
}): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO feedback (type, subject, content, email, user_agent, ip_hash)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      params.type,
      params.subject,
      params.content,
      params.email || "",
      params.userAgent || "",
      params.ipHash || "",
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function getFeedback(
  options: {
    status?: FeedbackStatus;
    type?: FeedbackType;
    limit?: number;
    offset?: number;
  } = {}
): Promise<FeedbackRow[]> {
  const db = getDb();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  let sql = "SELECT * FROM feedback";
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (options.status) {
    conditions.push("status = ?");
    args.push(options.status);
  }
  if (options.type) {
    conditions.push("type = ?");
    args.push(options.type);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  args.push(limit, offset);

  const result = await db.execute({ sql, args: args as string[] });
  return result.rows.map(row => ({
    id: row.id as number,
    type: row.type as FeedbackType,
    subject: row.subject as string,
    content: row.content as string,
    email: row.email as string,
    user_agent: row.user_agent as string,
    ip_hash: row.ip_hash as string,
    status: row.status as FeedbackStatus,
    priority: row.priority as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

export async function getFeedbackStats(): Promise<{
  total: number;
  open: number;
  bugs: number;
  features: number;
}> {
  const db = getDb();
  const [totalResult, openResult, bugsResult, featuresResult] = await Promise.all([
    db.execute("SELECT COUNT(*) as count FROM feedback"),
    db.execute("SELECT COUNT(*) as count FROM feedback WHERE status = 'open'"),
    db.execute("SELECT COUNT(*) as count FROM feedback WHERE type = 'bug'"),
    db.execute("SELECT COUNT(*) as count FROM feedback WHERE type = 'feature'"),
  ]);

  return {
    total: Number(totalResult.rows[0].count),
    open: Number(openResult.rows[0].count),
    bugs: Number(bugsResult.rows[0].count),
    features: Number(featuresResult.rows[0].count),
  };
}

export async function updateFeedbackStatus(
  id: number,
  status: FeedbackStatus
): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: "UPDATE feedback SET status = ?, updated_at = datetime('now') WHERE id = ?",
    args: [status, id],
  });
  return result.rowsAffected > 0;
}
