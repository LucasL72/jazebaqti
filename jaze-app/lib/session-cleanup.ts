import { prisma } from "./prisma";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = 0;

/**
 * Clean up expired sessions from the database.
 * Uses a throttle mechanism to prevent too frequent cleanups.
 * This is called opportunistically during session operations.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = Date.now();

  // Throttle: only run cleanup every CLEANUP_INTERVAL_MS
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return 0;
  }

  lastCleanup = now;

  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      console.log(`[Session Cleanup] Removed ${result.count} expired sessions`);
    }

    return result.count;
  } catch (error) {
    console.error(
      "[Session Cleanup] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return 0;
  }
}

/**
 * Force cleanup regardless of throttle (for manual/scheduled cleanup)
 */
export async function forceCleanupExpiredSessions(): Promise<number> {
  lastCleanup = 0;
  return cleanupExpiredSessions();
}
