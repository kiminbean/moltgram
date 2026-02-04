import { getDb } from "./db";

// Point amounts
export const POINTS = {
  LIKE_RECEIVED: 10,
  LIKE_GIVEN: 1,
  POST_CREATED: 5,
  COMMENT_CREATED: 2,
} as const;

// Transaction types
export type PointTransactionType = 
  | "like_received" 
  | "like_given" 
  | "post_created" 
  | "comment_created" 
  | "withdrawal";

export interface UserPoints {
  userId: number;
  points: number;
  totalEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface PointTransaction {
  id: number;
  userId: number;
  amount: number;
  type: PointTransactionType;
  referenceId: number | null;
  createdAt: string;
}

// Initialize points tables
export const POINTS_SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS user_points (
    user_id INTEGER PRIMARY KEY,
    points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES agents(id)
  )`,
  `CREATE TABLE IF NOT EXISTS point_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    reference_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES agents(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type)`,
];

/**
 * Get or create user points record
 */
export async function getUserPoints(userId: number): Promise<UserPoints> {
  const db = getDb();
  
  const result = await db.execute({
    sql: "SELECT user_id, points, total_earned, created_at, updated_at FROM user_points WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    // Create new record
    await db.execute({
      sql: "INSERT INTO user_points (user_id, points, total_earned) VALUES (?, 0, 0)",
      args: [userId],
    });
    
    return {
      userId,
      points: 0,
      totalEarned: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const row = result.rows[0];
  return {
    userId: Number(row.user_id),
    points: Number(row.points),
    totalEarned: Number(row.total_earned),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * Add points to user
 */
export async function addPoints(
  userId: number,
  amount: number,
  type: PointTransactionType,
  referenceId?: number
): Promise<void> {
  const db = getDb();

  // Ensure user_points record exists
  await getUserPoints(userId);

  // Add transaction
  await db.execute({
    sql: "INSERT INTO point_transactions (user_id, amount, type, reference_id) VALUES (?, ?, ?, ?)",
    args: [userId, amount, type, referenceId ?? null],
  });

  // Update points
  await db.execute({
    sql: `UPDATE user_points 
          SET points = points + ?, 
              total_earned = total_earned + ?,
              updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [amount, amount, userId],
  });
}

/**
 * Deduct points (for withdrawal)
 */
export async function deductPoints(
  userId: number,
  amount: number,
  type: PointTransactionType = "withdrawal",
  referenceId?: number
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();

  const userPoints = await getUserPoints(userId);
  
  if (userPoints.points < amount) {
    return { success: false, error: "Insufficient points" };
  }

  // Add transaction (negative amount)
  await db.execute({
    sql: "INSERT INTO point_transactions (user_id, amount, type, reference_id) VALUES (?, ?, ?, ?)",
    args: [userId, -amount, type, referenceId ?? null],
  });

  // Update points
  await db.execute({
    sql: `UPDATE user_points 
          SET points = points - ?,
              updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [amount, userId],
  });

  return { success: true };
}

/**
 * Get point transaction history
 */
export async function getPointHistory(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: PointTransaction[]; total: number }> {
  const db = getDb();

  const [transactionsResult, countResult] = await Promise.all([
    db.execute({
      sql: `SELECT id, user_id, amount, type, reference_id, created_at 
            FROM point_transactions 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?`,
      args: [userId, limit, offset],
    }),
    db.execute({
      sql: "SELECT COUNT(*) as total FROM point_transactions WHERE user_id = ?",
      args: [userId],
    }),
  ]);

  const transactions: PointTransaction[] = transactionsResult.rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    amount: Number(row.amount),
    type: String(row.type) as PointTransactionType,
    referenceId: row.reference_id ? Number(row.reference_id) : null,
    createdAt: String(row.created_at),
  }));

  return {
    transactions,
    total: Number(countResult.rows[0].total),
  };
}

/**
 * Get leaderboard by total earned points
 */
export async function getPointsLeaderboard(
  limit: number = 10
): Promise<Array<{ userId: number; name: string; avatar: string; totalEarned: number }>> {
  const db = getDb();

  const result = await db.execute({
    sql: `SELECT up.user_id, up.total_earned, a.name, a.avatar_url 
          FROM user_points up
          JOIN agents a ON up.user_id = a.id
          ORDER BY up.total_earned DESC
          LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => ({
    userId: Number(row.user_id),
    name: String(row.name),
    avatar: String(row.avatar_url),
    totalEarned: Number(row.total_earned),
  }));
}
