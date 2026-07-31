/**
 * Day Phase Speaking Time Helpers
 *
 * Speaking-order *computation* lives server-side in `convex/lib/speakingOrder.ts`
 * (the single source of truth, since ordering decisions are Convex mutations).
 * This module only holds the client-side time helpers used to render the
 * speaking timer.
 */

/**
 * Calculates the remaining speaking time in milliseconds.
 *
 * IMPORTANT: `currentServerTimeMs` MUST be a server-corrected timestamp
 * (e.g. from `useServerTime()` in `src/lib/time/serverTime.ts`). Passing
 * a raw `Date.now()` from the device clock will reintroduce the device
 * clock-skew bug — see `docs/server-time.md`.
 *
 * @param speakerStartedAt - Timestamp when the speaker started (ISO string or Date)
 * @param maxSpeakingTimeMs - Maximum speaking time in milliseconds
 * @param currentServerTimeMs - Server-corrected current time in milliseconds
 * @returns Remaining time in milliseconds (0 if time is up)
 */
export function calculateRemainingTime(
  speakerStartedAt: string | Date,
  maxSpeakingTimeMs: number,
  currentServerTimeMs: number
): number {
  const startTimeMs = new Date(speakerStartedAt).getTime();
  const elapsed = currentServerTimeMs - startTimeMs;
  const remaining = maxSpeakingTimeMs - elapsed;
  return Math.max(0, remaining);
}
