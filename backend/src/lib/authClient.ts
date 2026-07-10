import { createClient, type SupabaseClient, type SupportedStorage, type User } from "@supabase/supabase-js";
import { env } from "../config/env.js";

const url = env.supabaseUrl;
const anonKey = env.supabaseAnonKey;

export const isSupabaseAuthConfigured = Boolean(url && anonKey);

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export function mapSupabaseUser(u: User): AuthUser {
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? "",
    name: (meta.full_name as string) ?? (meta.name as string) ?? undefined,
    avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? undefined,
  };
}

/** In-memory storage adapter backing a single auth client instance. Lets us
 *  seed it from a cookie (e.g. a PKCE verifier saved between the OAuth start
 *  and callback requests) and dump its full contents back out afterwards,
 *  without needing to know auth-js's internal key naming. */
function createMemoryStorage(seed?: Record<string, string>): SupportedStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    isServer: true,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map),
  };
}

/** Fresh, per-request auth client. Required (not just preferred) for anything
 *  with internal GoTrue state — signUp, signInWithPassword, signInWithOAuth,
 *  exchangeCodeForSession, refreshSession — since a shared singleton would
 *  race between concurrent planners (refreshSession uses an instance-level
 *  de-dupe lock, and exchangeCodeForSession recovers the PKCE verifier from
 *  the client's own `storage`, not from an argument). */
export function createAuthClient(seed?: Record<string, string>) {
  const storage = createMemoryStorage(seed);
  const client = createClient(url as string, anonKey as string, {
    auth: {
      flowType: "pkce",
      // persistSession MUST be true: auth-js only wires up a custom `storage`
      // adapter when persistSession is true — with persistSession:false it
      // silently swaps in its own throwaway memory storage and ignores ours.
      // We need our adapter used so the PKCE code verifier written during
      // signInWithOAuth lands in our map and can be dumped into the OAuth
      // state cookie, then re-seeded on the callback for
      // exchangeCodeForSession. This is a per-request in-memory adapter, so
      // "persisting" only means writing to that ephemeral map — nothing
      // leaks across requests or planners.
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage,
    },
  });
  return { client, storage };
}

/** Shared singleton — safe only for the fully stateless `auth.getUser(jwt)`
 *  call, which never touches `storage`. Do not use for anything else. */
export const anonAuthClient: SupabaseClient | null = isSupabaseAuthConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { flowType: "pkce", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;
