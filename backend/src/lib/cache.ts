// Tiny in-process cache. No cross-instance coherency and no persistence
// across restarts — fine for a single Express process where the only goal is
// "don't repeat the same slow AI call within a short window."

interface AsyncEntry<T> {
  promise: Promise<T>;
  expiresAt: number | null; // null while the promise is still in flight
  value?: T; // set once settled — lets peek() read it back synchronously
}

const asyncStore = new Map<string, AsyncEntry<unknown>>();

/** Returns the cached value for `key` if fresh; otherwise calls `fn()` once
 *  and caches the result for `ttlMs` (or `ttlMs(value)`, letting the caller
 *  give a short TTL to a "nothing came back" result — e.g. a quota-exhausted
 *  or transiently-failing AI call — instead of caching it as long as a real
 *  success, which would otherwise leave the feature looking "stuck off" for
 *  the full TTL after any blip). Concurrent calls for the same cold key
 *  share the same in-flight promise instead of each triggering their own
 *  `fn()` — important for an expensive call (Gemini) that multiple requests
 *  can land on at once, e.g. two tabs open on the same event. A rejected
 *  `fn()` evicts the key so the next call retries instead of caching the
 *  failure. */
export function getOrSet<T>(
  key: string,
  ttlMs: number | ((value: T) => number),
  fn: () => Promise<T>,
): Promise<T> {
  const existing = asyncStore.get(key) as AsyncEntry<T> | undefined;
  if (existing && (existing.expiresAt === null || existing.expiresAt > Date.now())) {
    return existing.promise;
  }

  const promise = fn();
  asyncStore.set(key, { promise, expiresAt: null });
  promise
    .then((value) => {
      const entry = asyncStore.get(key);
      if (entry && entry.promise === promise) {
        entry.value = value;
        entry.expiresAt = Date.now() + (typeof ttlMs === "function" ? ttlMs(value) : ttlMs);
      }
    })
    .catch(() => {
      const entry = asyncStore.get(key);
      if (entry && entry.promise === promise) asyncStore.delete(key);
    });
  return promise;
}

/** Synchronous, no-regeneration read: returns the settled value for `key` if
 *  it's still fresh, or `undefined` otherwise (in flight, missing, or
 *  expired). Never triggers `fn()`. */
export function peek<T>(key: string): T | undefined {
  const entry = asyncStore.get(key) as AsyncEntry<T> | undefined;
  if (!entry || entry.expiresAt === null || entry.expiresAt <= Date.now()) return undefined;
  return entry.value;
}

/** Writes a value directly (no `fn()` call) — for a caller that already
 *  computed the result some other way and wants to seed the cache. */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  asyncStore.set(key, { promise: Promise.resolve(value), value, expiresAt: Date.now() + ttlMs });
}

/** Drops a key outright — for a caller that knows the underlying state just
 *  changed (e.g. a task was added to the ceremony a cached gap-check covers)
 *  and wants the next read to regenerate instead of serving stale data. */
export function invalidate(key: string): void {
  asyncStore.delete(key);
}
