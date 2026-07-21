import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/** Get the redirect path based on user role */
function getRedirectPathForRole(role: string): string {
  switch (role) {
    case "parent":
      return "/parent";
    case "super_admin":
      return "/super-admin";
    case "admin":
    case "owner":
    case "principal":
    case "teacher":
    case "assistant":
    case "accountant":
    case "receptionist":
      return "/staff";
    default:
      // 'user' or unknown role - redirect to root, frontend handles pending state
      return "/";
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if user already exists by openId
      let existingUser = await db.getUserByOpenId(userInfo.openId);

      // If not found by openId, check by email (handles manually-created users)
      if (!existingUser && userInfo.email) {
        const emailUser = await db.getUserByEmail(userInfo.email);
        if (emailUser && emailUser.openId.startsWith('manual_')) {
          // Link the OAuth openId to the existing manually-created user
          // Update the openId to the real OAuth openId via db helper
          await db.updateUserOpenId(emailUser.id, userInfo.openId);
          existingUser = { ...emailUser, openId: userInfo.openId };
        }
      }

      if (!existingUser) {
        // New user - auto-assign 'parent' role with isActive=false (pending admin approval)
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          role: 'parent',
          isActive: false,
          lastSignedIn: new Date(),
        });
      } else {
        // Existing user - just update lastSignedIn
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });
      }

      // Get the user from DB to determine their role for redirect
      const user = await db.getUserByOpenId(userInfo.openId);
      const redirectPath = getRedirectPathForRole(user?.role || "user");

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, redirectPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
