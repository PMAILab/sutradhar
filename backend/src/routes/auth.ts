import { Router, type Request } from "express";
import { getSupabase } from "../lib/supabaseClient.js";
import { createAuthClient, isSupabaseAuthConfigured, mapSupabaseUser, type AuthUser } from "../lib/authClient.js";
import { resolveUser } from "../lib/session.js";
import {
  clearOAuthStateCookie,
  clearSessionCookies,
  clearMockCookie,
  readMockCookie,
  readOAuthStateCookie,
  sanitizeReturnTo,
  setMockCookie,
  setOAuthStateCookie,
  setSessionCookies,
} from "../lib/cookies.js";
import { APP_ORIGIN, FRONTEND_ORIGIN } from "../lib/origins.js";

export const authRouter = Router();

function cookies(req: Request): Record<string, string> {
  return (req.cookies ?? {}) as Record<string, string>;
}

/** Prefer an explicit APP_ORIGIN over deriving from the request. In dev,
 *  requests to /api/* arrive through Vite's dev-server proxy, which
 *  rewrites the Host header to match its proxy target (localhost:4000) —
 *  so req.get('host') reports the wrong origin for building the OAuth
 *  redirect URL back to the browser-facing app (localhost:5173). In prod,
 *  Netlify's /api/* proxy (netlify.toml) means the browser only ever talks
 *  to the Netlify origin — that's the URL Supabase has allow-listed, and
 *  the only one this needs to resolve to (see lib/origins.ts). */
function requestOrigin(req: Request): string {
  return APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
}

/** Prefixes a sanitized, relative `returnTo`-style path with the frontend's
 *  own origin. Needed once frontend and backend are split across domains
 *  (Netlify + Render) — a bare `res.redirect('/dashboard')` from this API
 *  would otherwise land the browser on the API's own domain instead of
 *  back on the app. Falls back to a relative redirect (unchanged behavior)
 *  when FRONTEND_ORIGIN isn't set, e.g. a single combined-service deploy. */
function toFrontend(path: string): string {
  return FRONTEND_ORIGIN ? `${FRONTEND_ORIGIN}${path}` : path;
}

/** Supabase's raw GoTrue error strings are written for developers, not
 *  planners ("Email rate limit exceeded", "User already registered") — map
 *  the common ones to warm, on-brand copy instead of showing them as-is.
 *  Falls back to a plain generic message for anything unmapped, so a truly
 *  unexpected error string never leaks to the UI raw. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password don't quite match. Mind double-checking and trying again?";
  }
  if (m.includes("already registered") || m.includes("already exists")) {
    return "Looks like you already have an account with that email, try signing in instead.";
  }
  if (m.includes("rate limit")) {
    return "We're seeing a lot of requests right now, give it a couple of minutes and try again.";
  }
  if (m.includes("password") && m.includes("character")) {
    return "Your password needs at least 6 characters.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "That doesn't look like a valid email address.";
  }
  if (m.includes("signup") && m.includes("disabled")) {
    return "New sign-ups are paused right now, please check back soon.";
  }
  return "That didn't go through on our end. Mind giving it another try?";
}

// ─── Email / password ───────────────────────────────────────────────────

authRouter.post("/signup", async (req, res) => {
  const email: string = String(req.body?.email ?? "");
  const password: string = String(req.body?.password ?? "");
  const name: string | undefined = req.body?.name ? String(req.body.name) : undefined;

  if (!isSupabaseAuthConfigured) {
    const user: AuthUser = { id: `mock-${email}`, email, name: name || email.split("@")[0] };
    setMockCookie(res, user);
    res.json({ user });
    return;
  }

  const { client } = createAuthClient();
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) {
    res.json({ user: null, error: friendlyAuthError(error.message) });
    return;
  }
  if (!data.session) {
    // Email confirmation is required by the Supabase project's Auth settings.
    res.json({ user: null, error: "Check your email to confirm your account, then log in." });
    return;
  }
  setSessionCookies(res, data.session);
  res.json({ user: mapSupabaseUser(data.session.user) });
});

authRouter.post("/signin", async (req, res) => {
  const email: string = String(req.body?.email ?? "");
  const password: string = String(req.body?.password ?? "");

  if (!isSupabaseAuthConfigured) {
    const user: AuthUser = { id: `mock-${email}`, email, name: email.split("@")[0] };
    setMockCookie(res, user);
    res.json({ user });
    return;
  }

  const { client } = createAuthClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    res.json({ user: null, error: error ? friendlyAuthError(error.message) : "Sign in failed, mind trying again?" });
    return;
  }
  setSessionCookies(res, data.session);
  res.json({ user: mapSupabaseUser(data.session.user) });
});

authRouter.post("/signout", async (req, res) => {
  if (!isSupabaseAuthConfigured) {
    clearMockCookie(res);
    res.json({ success: true });
    return;
  }

  const at = cookies(req).sd_at;
  if (at) {
    try {
      await getSupabase().auth.admin.signOut(at, "global");
    } catch (err) {
      console.error("auth.admin.signOut failed (best-effort):", err);
    }
  }
  clearSessionCookies(res);
  res.json({ success: true });
});

// ─── Session bootstrap ───────────────────────────────────────────────────

authRouter.get("/session", async (req, res) => {
  if (!isSupabaseAuthConfigured) {
    const user = readMockCookie(cookies(req));
    res.json({ user, mock: true });
    return;
  }

  const user = await resolveUser(req, res);
  res.json({ user, mock: false });
});

// ─── Google OAuth (PKCE, fully server-mediated). redirectTo resolves to the
// Netlify origin (APP_ORIGIN, see lib/origins.ts) since that's the only one
// Supabase has allow-listed — Netlify's /api/* proxy (netlify.toml) then
// forwards that request to this same route server-to-server, so it's a
// same-origin request from the browser's perspective the whole way through.

authRouter.get("/google", async (req, res) => {
  const returnTo = sanitizeReturnTo(req.query.returnTo);

  if (!isSupabaseAuthConfigured) {
    setMockCookie(res, { id: "mock-google", email: "planner@example.com", name: "Guest Planner" });
    res.redirect(toFrontend(returnTo));
    return;
  }

  const { client, storage } = createAuthClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${requestOrigin(req)}/api/auth/google/callback`,
      skipBrowserRedirect: true,
      // Force Google's account picker every time instead of silently reusing
      // the browser's already-signed-in Google account. Supabase forwards
      // queryParams through to Google's authorize endpoint.
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    res.redirect(toFrontend("/login?authError=1"));
    return;
  }
  setOAuthStateCookie(res, { seed: storage.dump(), returnTo });
  res.redirect(data.url);
});

authRouter.get("/google/callback", async (req, res) => {
  const state = readOAuthStateCookie(cookies(req));
  clearOAuthStateCookie(res);

  if (!state) {
    res.redirect(toFrontend("/login?authError=1"));
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;
  if (!code) {
    res.redirect(toFrontend(`${state.returnTo}?authError=1`));
    return;
  }

  const { client } = createAuthClient(state.seed);
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    res.redirect(toFrontend(`${state.returnTo}?authError=1`));
    return;
  }
  setSessionCookies(res, data.session);
  res.redirect(toFrontend(state.returnTo));
});
