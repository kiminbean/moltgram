import { getDb } from "./db";

// Rate limit settings (per hour)
export const RATE_LIMITS = {
  like: { limit: 50, windowMs: 60 * 60 * 1000 },    // 시간당 50회
  post: { limit: 10, windowMs: 60 * 60 * 1000 },    // 시간당 10회
  comment: { limit: 30, windowMs: 60 * 60 * 1000 }, // 시간당 30회
} as const;

export type ActionType = keyof typeof RATE_LIMITS;

// Schema statements for security tables
export const SECURITY_SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    actionType TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    windowStart INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(userId, actionType, windowStart)`,
  `CREATE TABLE IF NOT EXISTS user_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    reason TEXT,
    blockedUntil INTEGER,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_blocks_user ON user_blocks(userId)`,
  `CREATE INDEX IF NOT EXISTS idx_user_blocks_until ON user_blocks(blockedUntil)`,
  `CREATE TABLE IF NOT EXISTS suspicious_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    actionType TEXT NOT NULL,
    reason TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user ON suspicious_activity_log(userId, createdAt)`,
];

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

/**
 * Check if user is currently blocked
 */
export async function isUserBlocked(userId: string): Promise<{ blocked: boolean; reason?: string; blockedUntil?: Date }> {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  
  const result = await db.execute({
    sql: `SELECT reason, blockedUntil FROM user_blocks 
          WHERE userId = ? AND (blockedUntil IS NULL OR blockedUntil > ?)
          ORDER BY blockedUntil DESC LIMIT 1`,
    args: [userId, now],
  });
  
  if (result.rows.length === 0) {
    return { blocked: false };
  }
  
  const row = result.rows[0];
  return {
    blocked: true,
    reason: row.reason as string,
    blockedUntil: row.blockedUntil ? new Date(Number(row.blockedUntil) * 1000) : undefined,
  };
}

/**
 * Block a user for a specified duration
 */
export async function blockUser(userId: string, reason: string, durationMs?: number): Promise<void> {
  const db = getDb();
  const blockedUntil = durationMs ? Math.floor((Date.now() + durationMs) / 1000) : null;
  
  await db.execute({
    sql: `INSERT INTO user_blocks (userId, reason, blockedUntil) VALUES (?, ?, ?)`,
    args: [userId, reason, blockedUntil],
  });
}

/**
 * Check rate limit for a specific action
 */
export async function checkRateLimit(
  userId: string,
  actionType: ActionType
): Promise<RateLimitResult> {
  const db = getDb();
  const config = RATE_LIMITS[actionType];
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const windowStartSec = Math.floor(windowStart / 1000);
  
  // Get current count for this window
  const result = await db.execute({
    sql: `SELECT count FROM rate_limits 
          WHERE userId = ? AND actionType = ? AND windowStart = ?`,
    args: [userId, actionType, windowStartSec],
  });
  
  const currentCount = result.rows.length > 0 ? Number(result.rows[0].count) : 0;
  const remaining = Math.max(0, config.limit - currentCount);
  const resetAt = new Date(windowStart + config.windowMs);
  
  return {
    allowed: currentCount < config.limit,
    remaining,
    resetAt,
    limit: config.limit,
  };
}

/**
 * Increment the rate limit counter for an action
 */
export async function incrementAction(userId: string, actionType: ActionType): Promise<void> {
  const db = getDb();
  const config = RATE_LIMITS[actionType];
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const windowStartSec = Math.floor(windowStart / 1000);
  
  // Try to update existing record first
  const updateResult = await db.execute({
    sql: `UPDATE rate_limits SET count = count + 1 
          WHERE userId = ? AND actionType = ? AND windowStart = ?`,
    args: [userId, actionType, windowStartSec],
  });
  
  // If no record exists, insert a new one
  if (updateResult.rowsAffected === 0) {
    await db.execute({
      sql: `INSERT INTO rate_limits (userId, actionType, count, windowStart) 
            VALUES (?, ?, 1, ?)`,
      args: [userId, actionType, windowStartSec],
    });
  }
}

/**
 * Clean up old rate limit records (call periodically)
 */
export async function cleanupOldRateLimits(): Promise<void> {
  const db = getDb();
  const oneHourAgo = Math.floor((Date.now() - 60 * 60 * 1000) / 1000);
  
  await db.execute({
    sql: `DELETE FROM rate_limits WHERE windowStart < ?`,
    args: [oneHourAgo],
  });
}

/**
 * Format rate limit error response
 */
export function formatRateLimitError(result: RateLimitResult): {
  error: string;
  retryAfter: number;
  remaining: number;
  limit: number;
} {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
  return {
    error: "Rate limit exceeded",
    retryAfter,
    remaining: result.remaining,
    limit: result.limit,
  };
}
