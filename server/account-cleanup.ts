import type { Request, Response } from "express";
import { getDb, deleteUser } from "./db";
import { users } from "../drizzle/schema";
import { lte, isNotNull, and } from "drizzle-orm";

/**
 * Account Cleanup Handler
 * -----------------------
 * Called by the Heartbeat cron system at /api/scheduled/account-cleanup
 * Permanently deletes user accounts whose 30-day grace period has expired.
 * Runs daily at 3:30 AM UTC.
 */
export async function accountCleanupHandler(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    // Authentication is handled by the requireCronSecret middleware in index.ts.
    // When CRON_SECRET is set, only requests with the correct Bearer token pass.
    // When running on Manus, the Heartbeat system is the only caller.

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const now = new Date();

    // Find all users whose deletion scheduled date has passed
    const expiredAccounts = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(
        and(
          isNotNull(users.deletionScheduledAt),
          lte(users.deletionScheduledAt, now)
        )
      );

    let deletedCount = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    for (const account of expiredAccounts) {
      try {
        await deleteUser(account.id);
        deletedCount++;
      } catch (err: any) {
        errors.push({ userId: account.id, error: err.message || "Unknown error" });
      }
    }

    const duration = Date.now() - startTime;

    res.json({
      ok: true,
      timestamp: now.toISOString(),
      duration: `${duration}ms`,
      found: expiredAccounts.length,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    res.status(500).json({
      error: err.message || "Account cleanup failed",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      context: { url: req.url, taskUid: (req as any).taskUid },
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  }
}
