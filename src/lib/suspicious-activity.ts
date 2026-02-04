import { getDb } from "./db";
import { blockUser, type ActionType } from "./security";

// Suspicious activity thresholds
const SUSPICIOUS_THRESHOLDS = {
  // 1분 내 동일 액션 10회 이상 → 의심
  actionsPerMinute: 10,
  // 최소 요청 간격 (ms) - 이보다 빠르면 비정상
  minRequestInterval: 500,
} as const;

// In-memory tracking for rapid requests (supplementary to DB)
const recentActions = new Map<string, number[]>();

/**
 * Track action timestamp for rapid request detection
 */
function trackActionTime(userId: string, actionType: ActionType): void {
  const key = `${userId}:${actionType}`;
  const now = Date.now();
  
  if (!recentActions.has(key)) {
    recentActions.set(key, []);
  }
  
  const timestamps = recentActions.get(key)!;
  timestamps.push(now);
  
  // Keep only last 2 minutes of data
  const twoMinutesAgo = now - 2 * 60 * 1000;
  const filtered = timestamps.filter(t => t > twoMinutesAgo);
  recentActions.set(key, filtered);
  
  // Cleanup old keys periodically
  if (recentActions.size > 10000) {
    for (const [k, v] of recentActions) {
      if (v.length === 0 || v[v.length - 1] < twoMinutesAgo) {
        recentActions.delete(k);
      }
    }
  }
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(
  userId: string,
  actionType: ActionType
): Promise<{ suspicious: boolean; reason?: string }> {
  const key = `${userId}:${actionType}`;
  const now = Date.now();
  const timestamps = recentActions.get(key) || [];
  
  // Check for rapid consecutive requests
  if (timestamps.length > 0) {
    const lastTimestamp = timestamps[timestamps.length - 1];
    if (now - lastTimestamp < SUSPICIOUS_THRESHOLDS.minRequestInterval) {
      return {
        suspicious: true,
        reason: `Rapid consecutive requests (${now - lastTimestamp}ms interval)`,
      };
    }
  }
  
  // Check for too many actions in 1 minute
  const oneMinuteAgo = now - 60 * 1000;
  const actionsInLastMinute = timestamps.filter(t => t > oneMinuteAgo).length;
  
  if (actionsInLastMinute >= SUSPICIOUS_THRESHOLDS.actionsPerMinute) {
    return {
      suspicious: true,
      reason: `Too many actions in 1 minute (${actionsInLastMinute} ${actionType} actions)`,
    };
  }
  
  // Track this action
  trackActionTime(userId, actionType);
  
  return { suspicious: false };
}

/**
 * Log suspicious activity to database
 */
export async function logSuspiciousActivity(
  userId: string,
  actionType: ActionType,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  
  await db.execute({
    sql: `INSERT INTO suspicious_activity_log (userId, actionType, reason, metadata) 
          VALUES (?, ?, ?, ?)`,
    args: [userId, actionType, reason, JSON.stringify(metadata || {})],
  });
}

/**
 * Handle suspicious activity: log and temporarily block user
 */
export async function handleSuspiciousActivity(
  userId: string,
  actionType: ActionType,
  reason: string
): Promise<void> {
  // Log the suspicious activity
  await logSuspiciousActivity(userId, actionType, reason, {
    timestamp: new Date().toISOString(),
    actionType,
  });
  
  // Temporarily block user for 1 hour
  const oneHour = 60 * 60 * 1000;
  await blockUser(userId, `Suspicious activity detected: ${reason}`, oneHour);
  
  console.warn(`[SECURITY] User ${userId} blocked for 1 hour: ${reason}`);
}

/**
 * Get recent suspicious activity logs for a user
 */
export async function getSuspiciousActivityLogs(
  userId: string,
  limit: number = 10
): Promise<Array<{
  id: number;
  actionType: string;
  reason: string;
  metadata: string;
  createdAt: string;
}>> {
  const db = getDb();
  
  const result = await db.execute({
    sql: `SELECT id, actionType, reason, metadata, createdAt 
          FROM suspicious_activity_log 
          WHERE userId = ? 
          ORDER BY createdAt DESC 
          LIMIT ?`,
    args: [userId, limit],
  });
  
  return result.rows as unknown as Array<{
    id: number;
    actionType: string;
    reason: string;
    metadata: string;
    createdAt: string;
  }>;
}
