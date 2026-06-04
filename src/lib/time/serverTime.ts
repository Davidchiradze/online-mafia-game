"use client";

import { createContext, useCallback, useContext } from "react";

/**
 * Server-corrected clock primitives for the client.
 *
 * Why this exists
 * ---------------
 * Convex mutations write absolute server timestamps (e.g. `votingStartedAt`
 * via `new Date().toISOString()`). On the client we then compute elapsed
 * time as `Date.now() - serverStart`. If the user's OS clock is wrong
 * (even by a few seconds) that subtraction is junk: the loader freezes at
 * 100%, voting timers snap to 0s, etc.
 *
 * The fix is to learn the server-vs-device clock offset once on app load
 * (fetched via `GET /api/time` in `ServerTimeProvider`), and use
 * `Date.now() + offset` everywhere we need "now" in timer math.
 *
 * Usage
 * -----
 * In hooks/components, prefer `useServerTime()`:
 *
 *   const getServerTime = useServerTime();
 *   const elapsedMs = getServerTime() - serverStartMs;
 *
 * In pure helpers (no React), accept a `currentServerTimeMs: number` arg
 * and have the calling hook pass `getServerTime()` into it. Never call
 * `Date.now()` or `new Date()` for timer math directly.
 *
 * What NOT to use this for
 * ------------------------
 * Pure local countdowns (e.g. `useFoulSpeak`) that only subtract local
 * `setInterval` ticks from each other are immune to clock skew and do
 * not need this primitive.
 */

type ServerTimeContextValue = {
  /** Milliseconds to add to `Date.now()` to get current server time. */
  serverTimeOffsetMs: number;
};

export const ServerTimeContext = createContext<ServerTimeContextValue>({
  serverTimeOffsetMs: 0,
});

/**
 * Returns a stable `getServerTime()` function that yields the current
 * server-corrected time in milliseconds (equivalent to what `Date.now()`
 * would return on the Vercel host at the moment of the call).
 *
 * The returned reference is stable for a given offset — it changes once
 * on first paint when the offset is measured, then stays constant. Safe
 * to put in `useEffect` dep arrays.
 */
export function useServerTime(): () => number {
  const { serverTimeOffsetMs } = useContext(ServerTimeContext);
  return useCallback(() => Date.now() + serverTimeOffsetMs, [serverTimeOffsetMs]);
}

/**
 * Returns the raw server-vs-device offset in milliseconds.
 * Equivalent to: `serverTimeMs - Date.now()` at measurement.
 *
 * Most callers should prefer `useServerTime()` instead.
 */
export function useServerTimeOffset(): number {
  return useContext(ServerTimeContext).serverTimeOffsetMs;
}
