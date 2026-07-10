import type { Request, Response } from "express";
import { anonAuthClient, createAuthClient, mapSupabaseUser, type AuthUser } from "./authClient.js";
import { clearSessionCookies, setSessionCookies } from "./cookies.js";

function cookies(req: Request): Record<string, string> {
  return (req.cookies ?? {}) as Record<string, string>;
}

/** Resolves the real (non-mock) authenticated planner from the sd_at/sd_rt
 *  session cookies, transparently refreshing and rotating cookies when the
 *  access token has expired. Returns null whenever Supabase auth isn't
 *  configured (no anonAuthClient, and sd_at/sd_rt are never set by anything
 *  in that case) — callers don't need a separate mock-mode branch. Used by
 *  both GET /api/auth/session (which reports null as `{user: null}`, never
 *  401s) and the requireAuth middleware (which 401s on null). */
export async function resolveUser(req: Request, res: Response): Promise<AuthUser | null> {
  const c = cookies(req);

  if (c.sd_at && anonAuthClient) {
    const { data, error } = await anonAuthClient.auth.getUser(c.sd_at);
    if (!error && data.user) return mapSupabaseUser(data.user);
  }

  if (c.sd_rt) {
    const { client } = createAuthClient();
    const { data, error } = await client.auth.refreshSession({ refresh_token: c.sd_rt });
    if (!error && data.session) {
      setSessionCookies(res, data.session);
      return mapSupabaseUser(data.session.user);
    }
    clearSessionCookies(res);
  }

  return null;
}
