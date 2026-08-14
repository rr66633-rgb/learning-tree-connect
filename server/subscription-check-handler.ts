/**
 * Subscription Check Handler
 * Scheduled endpoint to process expired subscriptions daily
 * Endpoint: /api/scheduled/subscription-check
 */
import { Request, Response } from "express";
import { processExpiredSubscriptions } from "./services/subscriptionService";

export async function subscriptionCheckHandler(req: Request, res: Response) {
  try {
    console.log("[Subscription Check] Starting daily subscription check...");
    const result = await processExpiredSubscriptions();
    console.log(`[Subscription Check] Done: ${result.expired} expired, ${result.disabled} disabled, ${result.reminders} reminders sent`);
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Subscription Check] Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
