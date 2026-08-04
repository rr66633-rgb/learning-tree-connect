import type { Request, Response } from "express";
import { getDb } from "./db";
import { storagePut } from "./storage";
import {
  users, children, attendance, dailyReports, conversations, messages,
  invoices, loyaltyPoints, loyaltyTransactions, loyaltyRewards,
  notifications, classes, staffAttendance, centerSettings, dailyActivities,
  calendarEvents, announcements, documents, signatures, medicalInfo,
  emergencyContacts, enrollment, waitingList, eyfsAssessments, auditLog
} from "../drizzle/schema";

/**
 * Daily Backup Handler
 * --------------------
 * Called by the Heartbeat cron system at /api/scheduled/daily-backup
 * Exports all database tables to a JSON file and stores it in S3.
 */
export async function dailyBackupHandler(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { sdk } = await import("./_core/sdk");
    const user = await sdk.authenticateRequest(req);
    // SECURITY FIX: this handler exports EVERY table -- including every
    // other organization's children, medical info, invoices, messages,
    // documents, etc. -- to a single JSON file in S3, and returns that
    // file's storage key/URL directly in the HTTP response. It was
    // previously gated by `role !== "admin"`, meaning ANY single
    // organization's own regular admin could manually trigger a full
    // platform-wide data export and receive the link to every other
    // organization's private data. Per policy, the only allowed
    // cross-organization actor is the authenticated Super Admin (or the
    // automated cron system itself).
    if (!user.isCron && user.role !== "super_admin") {
      res.status(403).json({ error: "cron-only or super_admin" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    // Export all tables
    const backup: Record<string, any[]> = {};

    const tables = [
      { name: "users", table: users },
      { name: "children", table: children },
      { name: "classes", table: classes },
      { name: "attendance", table: attendance },
      { name: "staffAttendance", table: staffAttendance },
      { name: "dailyReports", table: dailyReports },
      { name: "dailyActivities", table: dailyActivities },
      { name: "conversations", table: conversations },
      { name: "messages", table: messages },
      { name: "invoices", table: invoices },
      { name: "loyaltyPoints", table: loyaltyPoints },
      { name: "loyaltyTransactions", table: loyaltyTransactions },
      { name: "loyaltyRewards", table: loyaltyRewards },
      { name: "notifications", table: notifications },
      { name: "centerSettings", table: centerSettings },
      { name: "calendarEvents", table: calendarEvents },
      { name: "announcements", table: announcements },
      { name: "documents", table: documents },
      { name: "signatures", table: signatures },
      { name: "medicalInfo", table: medicalInfo },
      { name: "emergencyContacts", table: emergencyContacts },
      { name: "enrollment", table: enrollment },
      { name: "waitingList", table: waitingList },
      { name: "eyfsAssessments", table: eyfsAssessments },
      { name: "auditLog", table: auditLog },
    ];

    for (const { name, table } of tables) {
      try {
        backup[name] = await db.select().from(table);
      } catch (e) {
        backup[name] = [];
      }
    }

    // Create backup metadata
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toISOString().replace(/[:.]/g, "-");

    const backupData = {
      metadata: {
        createdAt: now.toISOString(),
        version: "1.0",
        tables: Object.keys(backup).map(name => ({
          name,
          rowCount: backup[name].length,
        })),
        totalRows: Object.values(backup).reduce((sum, rows) => sum + rows.length, 0),
      },
      data: backup,
    };

    // Store in S3
    const backupJson = JSON.stringify(backupData, null, 2);
    const backupBuffer = Buffer.from(backupJson, "utf-8");
    const backupKey = `backups/${dateStr}/backup-${timeStr}.json`;

    const { url, key } = await storagePut(backupKey, backupBuffer, "application/json");

    const duration = Date.now() - startTime;

    // Log to audit
    try {
      const { createAuditLog } = await import("./db");
      await createAuditLog({
        userId: 0, // system
        action: "daily_backup",
        resource: "database",
        details: {
          storageKey: key,
          storageUrl: url,
          totalRows: backupData.metadata.totalRows,
          tableCount: tables.length,
          durationMs: duration,
          date: dateStr,
        },
      });
    } catch (auditErr) {
      console.error("Failed to create audit log for backup:", auditErr);
    }

    res.json({
      ok: true,
      backup: {
        key,
        url,
        date: dateStr,
        totalRows: backupData.metadata.totalRows,
        tableCount: tables.length,
        sizeBytes: backupBuffer.length,
        durationMs: duration,
      },
    });
  } catch (error: any) {
    console.error("Daily backup failed:", error);
    res.status(500).json({
      error: error.message || "Backup failed",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      context: { url: req.url, taskUid: (req as any).taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
